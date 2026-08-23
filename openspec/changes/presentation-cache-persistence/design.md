# Design: Persist the presentation cache across Vercel instances (Upstash Redis)

## Technical Approach

Replace the module-scope `Map` in `src/cycle/latest.ts` and `src/narrative/cache.ts` with an async wrapper around `@upstash/redis`'s REST client, accessed through one new shared module `src/lib/redis.ts`. Public function names/arity stay stable (`put`/`get`/`getForAsset`/`clear`) except they now return `Promise`s; TTL enforcement moves entirely to Redis-native `SET ... EX`, so the app no longer computes or compares expiry timestamps itself. All three route handlers (`app/api/cycle`, `app/api/decisions`, `app/api/decisions/[asset]/narrative`) are already `async function`s — the only change is inserting `await` at each cache call.

## Architecture Decisions

| Decision | Choice | Rejected Alternatives | Rationale |
|---|---|---|---|
| Redis client type | `@upstash/redis`'s REST client (`Redis.fromEnv()`) | `ioredis` (raw TCP protocol) | Routes run `runtime='nodejs'` (TCP is technically available), but the deciding factor is serverless statelessness, not the Node/Edge boundary: each invocation is short-lived and Vercel scales across multiple concurrent instances, so a pooled TCP client adds connection-lifecycle risk (exhaustion, stale sockets) for zero benefit at this app's traffic (one push/6h, low read volume). Upstash built the REST client specifically for this execution model. |
| Client construction | Lazy singleton via `getRedis()` in `src/lib/redis.ts`, first call constructs and caches `Redis.fromEnv()` | Eager module-scope `export const redis = Redis.fromEnv()` | Mirrors `src/narrative/client.ts`'s T-5 deferred-construction pattern: a missing/misconfigured env var must surface as a caught runtime error inside `get`/`put`, not an import-time crash that breaks every route and `next build`. |
| Read failure handling | `get`/`getForAsset` catch all Redis errors (timeout, network, auth) and return `null` | Let the error propagate to the route | Confirmed proposal decision #1 — a `null` is indistinguishable from a real cache miss, so the caller's existing `503 NO_DATA` path fires unchanged with no new error branch needed in the routes. |
| Write failure handling | `put` does **not** catch; `POST /api/cycle` wraps it in `try/catch` and returns `502 CACHE_WRITE_FAILED` on error | Swallow the error and still return `200` | This cache has no fallback store — a silently-failed write means the report is durably nowhere. Returning `200` would give n8n a false-positive success and the bug would resurface invisibly (worse than today, since there's no retry/queue). `src/narrative/cache.ts`'s `put` failures are NOT surfaced (fire-and-forget `.catch(() => {})`) — that cache is cost-mitigation only, never correctness-bearing (matches its own doc comment). |
| TTL granularity | Redis-native `EX` (seconds), computed as `Math.max(1, Math.ceil(ttlMs / 1000))` | Keep app-level `atMs`/`expiresAt` comparison | Confirmed proposal decision #2. Drops millisecond precision to second precision — acceptable since production TTL (`BETA_MS`) is 5 days; tests needing sub-second boundaries must move to Vitest fake timers instead of a passed `atMs`. |
| `atMs` parameter | Removed from `put`/`get`/`getForAsset` | Keep as a test-only override | Once Redis owns expiry, an app-supplied `atMs` has no real effect on the server-side TTL clock — keeping it would be a dead/misleading parameter. Tests control time via `vi.useFakeTimers()`/`vi.setSystemTime()` against the fake Redis's own `Date.now()` use. |
| `MAX_ENTRIES`/oldest-eviction (narrative cache) | Dropped | Replicate an insertion-order-tracked eviction in Redis | Redis TTL already bounds storage; the old bound existed only because an in-memory `Map` had no other size ceiling. Removing it simplifies `src/narrative/cache.ts` and removes a class of app-code bugs, matching the same simplification rationale as decision #2. |
| Test double | In-memory fake implementing the `Redis` client's used surface (`get`,`set`,`del`), injected via `vi.mock('@/src/lib/redis', ...)` | Fake the whole cache module's own functions; real Upstash test instance | Mirrors `tests/narrative/client.test.ts`'s established pattern of mocking the low-level external client (`@anthropic-ai/sdk`), not the module under test — so `latest.ts`/`cache.ts`'s real key-scheme, serialization, and error-handling logic is genuinely exercised. Credential-free, fast, deterministic. |

## Data Flow

    n8n ──POST /api/cycle──▶ route ──runCycle()──▶ cache.put(market, report, BETA_MS)
                                                          │ SET cycle:latest:{market} EX <sec>
                                                          ▼
                                                    Upstash Redis (shared, cross-instance)
                                                          ▲
    Dashboard ──GET /api/decisions──▶ route ──cache.get(market)── GET cycle:latest:{market}
                                        │ null ⇒ 503 NO_DATA (fail-open, unchanged contract)

Narrative route: same shape, keys `narrative:{asset}:{t}`, narrative `put` failures swallowed.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/redis.ts` | Create | `getRedis()` lazy singleton, `Redis.fromEnv()` |
| `tests/helpers/fakeRedis.ts` | Create | In-memory fake: `get<T>`, `set(key,val,{ex})`, `del`, `__reset()` |
| `src/cycle/latest.ts` | Modify | Async, Redis-backed, key `cycle:latest:{market}`, drop `atMs` |
| `src/narrative/cache.ts` | Modify | Async, Redis-backed, key `narrative:{asset}:{t}`, drop `atMs`/`MAX_ENTRIES` |
| `app/api/cycle/route.ts` | Modify | `try { await cache.put(...) } catch { return 502 }` |
| `app/api/decisions/route.ts` | Modify | `await cache.get(market)` |
| `app/api/decisions/[asset]/narrative/route.ts` | Modify | `await cycleCache.getForAsset`, `await narrativeCache.get`, fire-and-forget `narrativeCache.put(...).catch(() => {})` |
| `tests/helpers/seedCycleCache.ts` | Modify | `seedCycleCache` becomes `async`, `await cycleCache.put` |
| `tests/cycle/latest.test.ts`, `tests/narrative/cache.test.ts` | Modify (rewrite) | Fake-Redis harness, fake timers replace `atMs`, drop eviction tests |
| `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts`, `tests/api/narrative.test.ts`, `tests/cycle/idempotency.test.ts` | Modify | `await seedCycleCache`, fake-Redis mock, add 502-on-write-failure + fail-open-on-read-failure cases |
| `package.json` | Modify | Add `@upstash/redis` dependency |
| `.env.example` | Modify | Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

## Interfaces / Contracts

```typescript
// src/lib/redis.ts
export function getRedis(): Redis; // lazy singleton

// src/cycle/latest.ts
export async function put(market: Market, report: DecisionReport, ttlMs: Millis): Promise<void>;
export async function get(market: Market): Promise<DecisionReport | null>;      // fail-open
export async function getForAsset(market: Market, asset: Asset): Promise<Decision | null>;
export async function clear(): Promise<void>;                                    // test-only

// src/narrative/cache.ts — same shape, keyed by (asset, t)
export async function put(asset: Asset, t: Millis, text: string, ttlMs?: Millis): Promise<void>; // never throws to caller
export async function get(asset: Asset, t: Millis): Promise<string | null>;      // fail-open
export async function clear(): Promise<void>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (RED→GREEN, real behavior change) | `src/cycle/latest.ts`/`src/narrative/cache.ts` key scheme, Redis-native TTL, fail-open on read error, put-error propagation | Rewrite `tests/cycle/latest.test.ts`, `tests/narrative/cache.test.ts` against `fakeRedis.ts` + Vitest fake timers |
| Integration (RED→GREEN) | Route `await` wiring; `502` on cycle-cache write failure; `503 NO_DATA` still fires on Redis read failure | Update `tests/api/decisions*.test.ts`, `tests/api/narrative.test.ts`, `tests/cycle/idempotency.test.ts`; add new failure-injection cases via `fakeRedis` throwing |
| Mechanical (no test) | `.env.example`, `package.json` dependency add | None — non-behavioral |
| Manual (cannot be automated) | `src/lib/redis.ts` against a real Upstash instance | See `[MANUAL-VERIFICATION-ONLY]` below |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Only an outbound HTTPS call to a managed Redis REST endpoint from existing route handlers.

## Migration / Rollout

No data migration — the cache is disposable/derived state. Rollout requires the manual prerequisite below before production traffic benefits from the fix; until then the code degrades to the same `503 NO_DATA` behavior as today (fail-open on read) if Redis env vars are absent/misconfigured. Rollback: revert commits, remove `@upstash/redis` and the env vars.

**`[MANUAL-VERIFICATION-ONLY]`** (final gate, cannot be automated in this session): user must (1) provision "Upstash for Redis" via Vercel Marketplace or a direct Upstash account, (2) add `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` to the Vercel project's environment variables, (3) redeploy, (4) confirm on the live Vercel deployment that the dashboard reliably shows data across multiple page loads/instances after one n8n push, without re-running n8n.

## Open Questions

- [ ] Total diff across 16 files may approach/exceed the 400-line PR review budget — `sdd-tasks` should evaluate chaining (e.g. cache modules + fake first, routes + remaining tests second).
