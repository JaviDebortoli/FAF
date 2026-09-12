# Tasks: Persist the presentation cache across Vercel instances (Upstash Redis)

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~800-950 total (2 new files, 2 rewritten cache modules + their tests, 3 route files, 1 test helper, 4 more test files updated, `package.json`/`.env.example`) |
| 400-line budget risk | High |
| Suggested split | PR1 Redis client + fake double -> PR2 `src/cycle/latest.ts` conversion (the bug fix) -> PR3 `src/narrative/cache.ts` conversion -> PR4 route wiring + remaining test updates |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (recommended — see Delivery Route Recommendation) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | `src/lib/redis.ts` lazy singleton + `tests/helpers/fakeRedis.ts` fake double + `@upstash/redis` dep + `.env.example` vars | PR1 | `npx vitest run tests/helpers/fakeRedis.test.ts` | N/A — no live Redis exists until Phase E provisions Upstash; the fake is the extent of what's provable pre-deployment | Revert `src/lib/redis.ts`, `tests/helpers/fakeRedis.ts`, `tests/helpers/fakeRedis.test.ts`, the `@upstash/redis` line in `package.json`, the 2 new lines in `.env.example`; nothing else references these yet |
| 2 | `src/cycle/latest.ts` async/Redis conversion (`cycle:latest:{market}`, native `EX`, fail-open reads, drop `atMs`) — the actual production bug fix | PR2 | `npx vitest run tests/cycle/latest.test.ts` | N/A — real cross-instance behavior is unprovable locally; proven only by Phase E's manual gate | Revert `src/cycle/latest.ts` + `tests/cycle/latest.test.ts`; route callers stay unconverted until PR4 (known transient-breakage window, see Delivery Route Recommendation, precedented in `acciones-market-integration` Phase A) |
| 3 | `src/narrative/cache.ts` async/Redis conversion (`narrative:{asset}:{t}`, drop `atMs`/`MAX_ENTRIES` eviction) | PR3 | `npx vitest run tests/narrative/cache.test.ts` | N/A — same reason as Unit 2 | Revert `src/narrative/cache.ts` + `tests/narrative/cache.test.ts`; independent of PR2 (different file, no shared code beyond `src/lib/redis.ts`) |
| 4 | Route wiring (`await`, new `502 CACHE_WRITE_FAILED` path) + `seedCycleCache` + remaining test updates | PR4 | `npx vitest run tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts tests/api/narrative.test.ts tests/api/cycle.test.ts tests/cycle/idempotency.test.ts` | N/A — same reason as Unit 2; this PR is what makes PR2/PR3's conversions actually reachable in production | Revert `app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `app/api/decisions/[asset]/narrative/route.ts`, `tests/helpers/seedCycleCache.ts`, and the 4 test files' diffs; PR1-3's cache modules stay async but unreached by any real caller |

## Phase A: Redis Client + Fake Test Double (PR1)

- [x] A.1 Create `src/lib/redis.ts`: `export function getRedis(): Redis` — lazy singleton, module-scope `let client: Redis | null = null`, constructs `Redis.fromEnv()` only on first call (mirrors `src/narrative/client.ts`'s T-5 deferred-construction pattern — a missing/misconfigured env var must surface inside `get`/`put`, not at import time).
- [x] A.2 `package.json`: add `@upstash/redis` as a dependency (`npm install @upstash/redis`).
- [x] A.3 `.env.example`: add `UPSTASH_REDIS_REST_URL=` and `UPSTASH_REDIS_REST_TOKEN=` placeholder lines.
- [x] A.4 Create `tests/helpers/fakeRedis.ts`: in-memory fake implementing the client surface `latest.ts`/`cache.ts` use — `get<T>(key): Promise<T | null>`, `set(key, val, { ex }): Promise<'OK'>`, `del(key): Promise<number>`, plus a test-only `__reset()`; TTL tracked against `Date.now()` so it composes with `vi.useFakeTimers()`/`vi.setSystemTime()`.
- [x] A.5 RED→GREEN self-test `tests/helpers/fakeRedis.test.ts` (new, thin, since B/C/D's real tests depend on this fake being correct): `set` with `ex` expires the entry once fake-timer time passes it; `get` returns `null` for a missing or expired key; `del` removes a key and a subsequent `get` misses.
- [x] A.6 Verify GREEN: `npx vitest run tests/helpers/fakeRedis.test.ts` + `npx tsc --noEmit`.

## Phase B: `src/cycle/latest.ts` Conversion (PR2 — the bug fix)

- [x] B.1 RED rewrite `tests/cycle/latest.test.ts`: `vi.mock('@/src/lib/redis', ...)` returning `fakeRedis`; replace every `atMs` argument with `vi.useFakeTimers()`/`vi.setSystemTime()`; keep the existing 6 scenarios (cross-market isolation both directions, independent TTL expiry, `getForAsset` market isolation both directions, `clear()`); assert the Redis key scheme `cycle:latest:{market}` is used. Confirm this fails against the not-yet-converted `latest.ts`.
- [x] B.2 GREEN `src/cycle/latest.ts`: convert `put`/`get`/`getForAsset`/`clear` to `async`, backed by `getRedis()`; `put(market, report, ttlMs)` calls `redis.set(\`cycle:latest:${market}\`, JSON.stringify(report), { ex: Math.max(1, Math.ceil(ttlMs / 1000)) })` and does NOT catch errors (propagates to the caller — design.md's Write failure handling decision); `get`/`getForAsset` catch all errors and return `null` (fail-open, design.md's Read failure handling decision); drop the `atMs` parameter entirely.
- [x] B.3 Verify GREEN: `npx vitest run tests/cycle/latest.test.ts` + `npx tsc --noEmit` (errors in not-yet-converted callers are expected/deferred to PR4, per this change's chained-PR strategy).

## Phase C: `src/narrative/cache.ts` Conversion (PR3)

- [x] C.1 RED rewrite `tests/narrative/cache.test.ts`: same fake-Redis mock + fake-timers approach as Phase B; drop the 2 `MAX_ENTRIES`/oldest-eviction tests entirely (Redis TTL already bounds storage, design.md decision); keep get/put, expiry-boundary, and new-`t`-invalidation scenarios; assert key scheme `narrative:{asset}:{t}`.
- [x] C.2 GREEN `src/narrative/cache.ts`: convert `put`/`get`/`clear` to `async`, backed by `getRedis()`, same `EX`-TTL shape as `latest.ts` — **deviation from this task's original text**: `put` does NOT propagate errors; it catches and swallows them INSIDE this module (matches design.md's Interfaces/Contracts annotation `Promise<void>; // never throws to caller`, which is more specific/authoritative than this task line's "also propagates errors" — see Deviations note in apply-progress.md); delete `MAX_ENTRIES`, the `entries` size check, and the oldest-eviction branch entirely; drop `atMs`.
- [x] C.3 Verify GREEN: `npx vitest run tests/narrative/cache.test.ts` (13/13 passed) + `npx tsc --noEmit` (5 errors, all pre-existing-shape in `app/api/decisions/[asset]/narrative/route.ts`, Phase D scope).

## Phase D: Route Wiring + Remaining Test Updates (PR4)

- [x] D.1 RED `tests/api/decisions.test.ts` + `tests/api/decisions-invariance.test.ts`: switch every `seedCycleCache(...)` call to `await`; add a fail-open scenario — `fakeRedis.get` mocked to throw still yields `503 NO_DATA` unchanged.
- [x] D.2 GREEN `app/api/decisions/route.ts`: `const cached = await cache.get(market);` (fail-open behavior already lives inside `latest.ts` from Phase B, no new branch needed here).
- [x] D.3 RED extend `tests/api/cycle.test.ts`: a Redis write failure on `cache.put` (mocked `fakeRedis.set` rejection) yields `502` with `{ error, code: 'CACHE_WRITE_FAILED' }`; existing success-path assertions stay green.
- [x] D.4 GREEN `app/api/cycle/route.ts`: wrap the cache write — `try { await cache.put(report.market, report, BETA_MS); } catch { return Response.json({ error: 'Failed to persist cycle result', code: 'CACHE_WRITE_FAILED' }, { status: 502 }); }`.
- [x] D.5 GREEN `tests/helpers/seedCycleCache.ts`: `seedCycleCache` becomes `async`, `await cycleCache.put(market, report, ttlMs)`.
- [x] D.6 RED `tests/api/narrative.test.ts`: `await` every `cycleCache.getForAsset`/`narrativeCache.get` interaction through the fake; add a fail-open scenario for `cycleCache.getForAsset` throwing (still `404 NO_DECISION`, not a 500); add a scenario confirming a `narrativeCache.put` write failure is silently swallowed (route still returns a `200` stream, no unhandled rejection).
- [x] D.7 GREEN `app/api/decisions/[asset]/narrative/route.ts`: `await cycleCache.getForAsset(market, asset)`; `const cached = await narrativeCache.get(asset, decision.t);`; the cache write stays a bare, unawaited `narrativeCache.put(asset, decision.t, fullText)` — no `.catch(() => {})` needed (Phase C's `put` never throws to its caller).
- [x] D.8 RED+GREEN `tests/cycle/idempotency.test.ts`: audited — this file never calls `seedCycleCache`/`cycleCache.*` directly (only `runCycle`), so no `await` insertions or production code changes were needed here beyond D.5/B.2.
- [x] D.9 Verify GREEN: `npx vitest run tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts tests/api/narrative.test.ts tests/api/cycle.test.ts tests/cycle/idempotency.test.ts` + `npx tsc --noEmit` (zero errors across the full stack now that A-D are all converted).

## Phase E: Final Full-Suite Verification + Manual Gate

- [x] E.1 Run `npx vitest run` + `npx tsc --noEmit` + `npx playwright test` — all green across the full 4-PR stack.
- [x] E.2 Confirm `src/domain/`, `src/decision/policy.ts`, `src/stream/`, `src/laf/`, `n8n/` have zero diff vs. pre-PR1 baseline (`git diff <base> --stat` across those paths, empty output) — this change touches only the 2 cache modules, 3 routes, 1 test helper, and their tests.
- [x] E.3 Self-check spec scenarios: `semantic-ingestion`'s "Market-keyed presentation cache" (5 scenarios: acciones-doesn't-affect-crypto, crypto-doesn't-affect-acciones, cross-instance visibility, Redis-unreachable-yields-503, TTL-native-expiry) and `decision-narrative`'s "Cost-mitigation caching" (3 scenarios: repeated-open-reuses-cache, new-decision-invalidates-cache, cross-instance narrative hit) each map to a passing test from Phases B-D.
- [x] E.4 `[MANUAL-VERIFICATION-ONLY]` User provisions "Upstash for Redis" via Vercel Marketplace or a direct Upstash account. Confirmed 2026-09-11.
- [x] E.5 `[MANUAL-VERIFICATION-ONLY]` User adds `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` to the Vercel project's environment variables. Confirmed 2026-09-11.
- [x] E.6 `[MANUAL-VERIFICATION-ONLY]` User redeploys. Confirmed 2026-09-11.
- [x] E.7 `[MANUAL-VERIFICATION-ONLY]` User confirms, on the live Vercel deployment, that the dashboard reliably shows data across multiple page loads/instances after a single n8n push, without needing to re-run n8n — this is the actual proof the production bug (intermittent "Servicio no disponible") is fixed, and cannot be established by local tests alone. User-confirmed 2026-09-11 across multiple instances, matching the exact criterion (repeated page loads/instances after a single n8n push, no n8n re-run needed).

## Delivery Route Recommendation

**stacked-to-main** (pending user confirmation), matching this repo's precedent (`acciones-market-integration`, `no-recommendation-filter-and-i18n`). Known risk specific to this change: PR2 (Phase B) converts `latest.ts` to async before PR4 (Phase D) updates its callers, and PR3 (Phase C) does the same for `narrative/cache.ts` — the routes will type-check (calling an async function without `await` is valid TS) but behave incorrectly if deployed mid-stack (a pending `Promise` is always truthy, so `GET /api/decisions` would stop returning real `503 NO_DATA` misses correctly). This exact transient-breakage window is already precedented in `acciones-market-integration` Phase A ("errors confined to Phase B/C/D downstream callers — expected per chained-PR strategy"): acceptable because PRs merge in close succession, not because the window is safe to leave deployed. If the team prefers zero transient-breakage risk, use **feature-branch-chain** instead (PR1-3 target a tracker branch, only the tracker merges to main after PR4 lands) — this is the safer alternative given the above coupling; flagging for the user's chain-strategy decision.

## Implementation Order

Phase A -> Phase B -> Phase C -> Phase D -> Phase E. Phase A is the hard foundation — nothing else can `vi.mock('@/src/lib/redis', ...)` without the fake existing first. Phase B and Phase C are independent of each other (different files, no shared code beyond `src/lib/redis.ts`) and may be sequenced in either order, but both must land before Phase D, since Phase D's route/test changes depend on both cache modules already being async. Phase E runs only after all 4 PRs merge, and closes with the `[MANUAL-VERIFICATION-ONLY]` gate — the only proof this change actually fixes the production bug.

## Phase F — Remediation (2026-08-23)

First live production test on 2026-08-23: deterministic `503` on both markets, n8n writes green. Root cause (design.md "Remediation Phase F", orchestrator-verified): `@upstash/redis` defaults `automaticDeserialization: true`, so `get()` returns a PARSED object; `src/cycle/latest.ts`'s `JSON.parse(raw)` then throws `SyntaxError`, swallowed by the fail-open `catch` → `null` → `503 NO_DATA`. Invisible locally because `fakeRedis` returns values verbatim and `getRedis()` is `vi.mock`'d in every test. Phases A–E above are historical record — this section is the only operative plan.

### Phase F Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~40-60 (1 new guard test file, 1 constructor option, 2 doc comments) |
| Session review budget | 800 lines |
| Budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

Strict TDD Mode ACTIVE — RED → GREEN. Runner: `npx vitest run && npx playwright test`.

- [x] F.1 RED: create `tests/lib/redis.test.ts` — `vi.mock('@upstash/redis')` with a `Redis` constructor spy; import the REAL `src/lib/redis.ts` (the ONLY test that must NOT use the `vi.mock('@/src/lib/redis')` pattern); set the env vars, call `getRedis()`, assert the constructor received an options object with `automaticDeserialization: false`. Confirm it FAILS against current code (option absent).
- [x] F.2 GREEN: `src/lib/redis.ts` — pass `automaticDeserialization: false` in `new Redis({ url, token, ... })`; update the module doc comment to record why (SDK-default auto-deserialization → double-parse → swallowed `SyntaxError` → 503; design.md "Remediation Phase F").
- [x] F.3 Doc: `tests/helpers/fakeRedis.ts` — doc-comment-only edit recording that it models the client AS CONFIGURED with `automaticDeserialization: false`; verbatim-value semantics are faithful ONLY under that configuration.
- [x] F.4 Verify full-suite GREEN: `npx vitest run && npx playwright test` — all pre-existing tests pass UNCHANGED (fake behavior does not change), plus the new F.1 guard; `npx tsc --noEmit` clean.

**Out of scope (recorded, not implemented):** the narrative-cache latent hazard (`src/narrative/cache.ts`'s `get()` has no `JSON.parse` chain — inert under `automaticDeserialization: false`; documented in design.md, deliberately not fixed). The Phase E manual gate E.4–E.7 stays user-owned and is re-attempted AFTER this fix deploys.
