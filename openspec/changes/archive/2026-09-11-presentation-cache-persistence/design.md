# Design: Persist the presentation cache across Vercel instances (Upstash Redis)

> **Amendment convention** — content tagged `[Rem. F]` was added or amended in **Remediation Phase F (2026-08-23)** after the first live production test exposed a client-construction defect; all untagged content is the original design, preserved unchanged. See the "Remediation Phase F" section for the full incident record.

## Technical Approach

Replace the module-scope `Map` in `src/cycle/latest.ts` and `src/narrative/cache.ts` with an async wrapper around `@upstash/redis`'s REST client, accessed through one new shared module `src/lib/redis.ts`. Public function names/arity stay stable (`put`/`get`/`getForAsset`/`clear`) except they now return `Promise`s; TTL enforcement moves entirely to Redis-native `SET ... EX`, so the app no longer computes or compares expiry timestamps itself. All three route handlers (`app/api/cycle`, `app/api/decisions`, `app/api/decisions/[asset]/narrative`) are already `async function`s — the only change is inserting `await` at each cache call.

## Architecture Decisions

| Decision | Choice | Rejected Alternatives | Rationale |
|---|---|---|---|
| Redis client type | `@upstash/redis`'s REST client (`Redis.fromEnv()`) | `ioredis` (raw TCP protocol) | Routes run `runtime='nodejs'` (TCP is technically available), but the deciding factor is serverless statelessness, not the Node/Edge boundary: each invocation is short-lived and Vercel scales across multiple concurrent instances, so a pooled TCP client adds connection-lifecycle risk (exhaustion, stale sockets) for zero benefit at this app's traffic (one push/6h, low read volume). Upstash built the REST client specifically for this execution model. |
| Client construction | Lazy singleton via `getRedis()` in `src/lib/redis.ts`, first call constructs and caches the client. `[Rem. F]` Constructed as `new Redis({ url, token, automaticDeserialization: false })` — the explicit-config form is required both for this project's env-var naming and (critically) to disable the SDK's default auto-deserialization | Eager module-scope `export const redis = ...`; `[Rem. F]` SDK-default construction (`automaticDeserialization: true`) | Mirrors `src/narrative/client.ts`'s T-5 deferred-construction pattern: a missing/misconfigured env var must surface as a caught runtime error inside `get`/`put`, not an import-time crash that breaks every route and `next build`. `[Rem. F]` `automaticDeserialization: false` is MANDATORY, not cosmetic: with the SDK default, `get()` auto-parses JSON-looking values and returns the parsed object, which `src/cycle/latest.ts` then double-parses into a `SyntaxError` that the fail-open `catch` swallows — the exact chain that caused the 2026-08-23 production outage (deterministic 503 both markets, green n8n writes). Full root cause in "Remediation Phase F" below. |
| Read failure handling | `get`/`getForAsset` catch all Redis errors (timeout, network, auth) and return `null` | Let the error propagate to the route | Confirmed proposal decision #1 — a `null` is indistinguishable from a real cache miss, so the caller's existing `503 NO_DATA` path fires unchanged with no new error branch needed in the routes. |
| Write failure handling | `put` does **not** catch; `POST /api/cycle` wraps it in `try/catch` and returns `502 CACHE_WRITE_FAILED` on error | Swallow the error and still return `200` | This cache has no fallback store — a silently-failed write means the report is durably nowhere. Returning `200` would give n8n a false-positive success and the bug would resurface invisibly (worse than today, since there's no retry/queue). `src/narrative/cache.ts`'s `put` failures are NOT surfaced (fire-and-forget `.catch(() => {})`) — that cache is cost-mitigation only, never correctness-bearing (matches its own doc comment). |
| TTL granularity | Redis-native `EX` (seconds), computed as `Math.max(1, Math.ceil(ttlMs / 1000))` | Keep app-level `atMs`/`expiresAt` comparison | Confirmed proposal decision #2. Drops millisecond precision to second precision — acceptable since production TTL (`BETA_MS`) is 5 days; tests needing sub-second boundaries must move to Vitest fake timers instead of a passed `atMs`. |
| `atMs` parameter | Removed from `put`/`get`/`getForAsset` | Keep as a test-only override | Once Redis owns expiry, an app-supplied `atMs` has no real effect on the server-side TTL clock — keeping it would be a dead/misleading parameter. Tests control time via `vi.useFakeTimers()`/`vi.setSystemTime()` against the fake Redis's own `Date.now()` use. |
| `MAX_ENTRIES`/oldest-eviction (narrative cache) | Dropped | Replicate an insertion-order-tracked eviction in Redis | Redis TTL already bounds storage; the old bound existed only because an in-memory `Map` had no other size ceiling. Removing it simplifies `src/narrative/cache.ts` and removes a class of app-code bugs, matching the same simplification rationale as decision #2. |
| Test double | In-memory fake implementing the `Redis` client's used surface (`get`,`set`,`del`), injected via `vi.mock('@/src/lib/redis', ...)`. `[Rem. F]` The fake models the client **as configured** (`automaticDeserialization: false`) — its verbatim-value semantics are faithful ONLY under that configuration; a construction-options guard test now pins that configuration (see "Remediation Phase F") | Fake the whole cache module's own functions; real Upstash test instance; `[Rem. F]` fake modeling the SDK's DEFAULT auto-deserialization semantics | Mirrors `tests/narrative/client.test.ts`'s established pattern of mocking the low-level external client (`@anthropic-ai/sdk`), not the module under test — so `latest.ts`/`cache.ts`'s real key-scheme, serialization, and error-handling logic is genuinely exercised. Credential-free, fast, deterministic. `[Rem. F]` Fidelity-gap lesson: a test double must model the SDK's deserialization semantics, not just its method surface — the verbatim fake passed 293 vitest + 53 playwright tests while production double-parsed every read into a swallowed `SyntaxError`. |

**`[Rem. F]` Latent hazard — narrative cache read path (documented, deliberately NOT fixed here).** `src/narrative/cache.ts`'s `get()` returns `raw` directly with no `JSON.parse`, so it has no double-parse chain. Today it is safe only because prose narrative text is not JSON-parseable — the SDK (even with auto-deserialization ON) would fall back to the raw string. If narrative text ever became JSON-parseable (e.g. a future structured-narrative format), an SDK-default client would silently return the wrong shape. With the Remediation Phase F client configuration (`automaticDeserialization: false`) this hazard is inert for both caches; it is recorded here so any future change to the client construction or the narrative payload format re-evaluates it.

## Remediation Phase F (2026-08-23)

**Incident evidence.** First live test of the deployed system on 2026-08-23: deterministic `503 Servicio no Disponible` on BOTH markets while the n8n `POST /api/cycle` flow was fully green — writes succeeded, every read missed. All 293 vitest + 53 playwright tests had passed locally; verify was FAIL pending only the Phase E manual gate.

**Root cause (orchestrator-verified against official Upstash docs — established fact).**

1. `@upstash/redis` defaults `automaticDeserialization: true`: `get()` auto-parses any JSON-looking stored value and returns the PARSED OBJECT, not the raw string. `set()` stores pre-stringified strings as-is — which is why writes worked and n8n stayed green.
2. `getRedis()` constructed `new Redis({ url, token })` WITHOUT `automaticDeserialization: false`.
3. `src/cycle/latest.ts`'s `get()` then ran `JSON.parse(raw)` where `raw` was already an object → `JSON.parse("[object Object]")` → `SyntaxError` → the deliberate fail-open `catch { return null; }` (decision: Read failure handling) swallowed it → every read returned `null` → deterministic `503 NO_DATA`, both markets. The fail-open contract — correct for genuine Redis failures — turned a client misconfiguration into an invisible total read outage.
4. `tests/helpers/fakeRedis.ts` returns stored values verbatim (node-redis semantics); it never modeled the SDK's auto-deserialization, so the entire local suite passed against this fidelity gap — the bug was invisible to it by construction.
5. `getRedis()` is `vi.mock`'d in every downstream test, so NOTHING tested the real client's construction options.

**Fix (decided).** Construct the client with `automaticDeserialization: false` in `getRedis()`. This keeps the explicit `JSON.stringify`/`JSON.parse` contract in the cache modules and makes production behavior EXACTLY match the existing fake/tests — zero behavior change needed in `fakeRedis` itself.

**Regression net.** New construction-options guard test (`tests/lib/redis.test.ts`): `vi.mock('@upstash/redis')` with a `Redis` constructor spy asserting `automaticDeserialization: false` is passed — this is the only test that exercises the real construction line, the exact line that failed in production.

**Fake documentation.** `tests/helpers/fakeRedis.ts`'s doc comment must record WHICH client configuration it models: verbatim semantics are faithful only BECAUSE deserialization is disabled in `getRedis()`.

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
| `src/lib/redis.ts` | Create; `[Rem. F]` Modify | `getRedis()` lazy singleton, explicit env-var resolution; `[Rem. F]` pass `automaticDeserialization: false` to the `Redis` constructor |
| `tests/helpers/fakeRedis.ts` | Create; `[Rem. F]` Modify (doc comment only) | In-memory fake: `get<T>`, `set(key,val,{ex})`, `del`, `__reset()`; `[Rem. F]` doc comment records it models the client AS CONFIGURED with `automaticDeserialization: false` |
| `tests/lib/redis.test.ts` | `[Rem. F]` Create | Construction-options guard: `vi.mock('@upstash/redis')` constructor spy asserts `automaticDeserialization: false` is passed |
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
| Unit — construction guard `[Rem. F]` | `src/lib/redis.ts` passes `automaticDeserialization: false` to the `Redis` constructor (the exact line that failed in prod) | New `tests/lib/redis.test.ts`: `vi.mock('@upstash/redis')`, spy the constructor, invoke `getRedis()`, assert the option — the only test not behind the `getRedis()` mock |
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
