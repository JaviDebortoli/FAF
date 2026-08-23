# Apply Progress: presentation-cache-persistence

**Phase B of 6** (4 code phases [A domain foundation, B cycle cache, C narrative cache, D route wiring] + Phase E manual verification) — Phases A and B complete. `src/cycle/latest.ts` (the production bug fix) is now async/Redis-backed, but its 3 route callers (`app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `app/api/decisions/[asset]/narrative/route.ts`) are NOT yet updated to `await` it — that is Phase D scope. Phases C/D remain untouched.

## Mode

Strict TDD Mode: active project-wide. This unit's `.env.example`/`package.json` additions are mechanical/non-behavioral per design.md's Testing Strategy table (no test possible/needed). `fakeRedis.ts` used a correctness-by-construction implementation followed immediately by a confirming self-test (`fakeRedis.test.ts`), per the task's own stated flexibility ("either RED→GREEN or construction+confirming-test is acceptable for this specific utility").

## Completed Tasks (Phase A — all 6)

- [x] A.1 Created `src/lib/redis.ts` — `getRedis()` lazy singleton wrapping `Redis.fromEnv()`, deferred construction on first call (mirrors `src/narrative/client.ts`'s T-5 pattern).
- [x] A.2 Added `@upstash/redis` (`^1.38.2`) to `package.json` dependencies via `npm install @upstash/redis` (also updated `package-lock.json`).
- [x] A.3 Added `UPSTASH_REDIS_REST_URL=` / `UPSTASH_REDIS_REST_TOKEN=` placeholder lines to `.env.example`, with an explanatory comment block matching the file's existing style.
- [x] A.4 Created `tests/helpers/fakeRedis.ts` — in-memory fake exposing `get<T>(key)`, `set(key, value, { ex })`, `del(key)`, and a test-only `__reset()`; TTL tracked via `Date.now()` so it composes with `vi.useFakeTimers()`/`vi.setSystemTime()`.
- [x] A.5 Wrote `tests/helpers/fakeRedis.test.ts` — 8 tests covering get/set roundtrip, missing-key miss, `ex`-based expiry (both "still fresh" and "just expired" boundaries using fake timers), no-TTL persistence, `del` removing a key (and `del` on a missing key returning `0`), and `__reset()` clearing all entries.
- [x] A.6 Verified GREEN: `npx vitest run tests/helpers/fakeRedis.test.ts` (8/8 pass) + `npx tsc --noEmit` (clean, zero errors).

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `src/lib/redis.ts` | Created | `getRedis(): Redis` lazy singleton wrapping `Redis.fromEnv()` |
| `tests/helpers/fakeRedis.ts` | Created | In-memory fake Redis double: `get`/`set`/`del`/`__reset()` |
| `tests/helpers/fakeRedis.test.ts` | Created | 8-test self-test suite for the fake double's get/set/del/expiry semantics |
| `package.json` | Modified | Added `@upstash/redis: ^1.38.2` dependency |
| `package-lock.json` | Modified | Lockfile update from `npm install @upstash/redis` |
| `.env.example` | Modified | Added `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` placeholders + comment |
| `openspec/changes/presentation-cache-persistence/tasks.md` | Modified | Marked A.1–A.6 `[x]` |

Nothing in this phase is imported/called by `src/cycle/latest.ts`, `src/narrative/cache.ts`, or any route — those conversions are Phases B/C/D. `getRedis()` and `fakeRedis` currently have zero real callers.

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| A.1 `src/lib/redis.ts` | N/A — mechanical per design.md Testing Strategy (no behavior to fail against; correctness is "does it return a lazy singleton", proven by A.6's `tsc --noEmit` + downstream Phase B/C consumption) | Implemented `getRedis()` | Doc comment added explaining T-5 deferred-construction rationale |
| A.4/A.5 `fakeRedis.ts` | Implementation written first (construction-by-correctness, per task's stated flexibility), then `fakeRedis.test.ts` written to confirm — not a fabricated pre-implementation failing test | 8/8 tests pass against the implementation as written | None needed — implementation matched the spec's get/set/del/expiry contract on first pass |
| A.2 `package.json` | N/A — mechanical, no test possible | `npm install @upstash/redis` | N/A |
| A.3 `.env.example` | N/A — mechanical, no test possible | Added placeholder vars + comment | N/A |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/helpers/fakeRedis.test.ts` → 1 file, 8/8 tests passed |
| Runtime harness command/scenario and exact result | N/A — no live Redis exists until Phase E provisions Upstash; `src/lib/redis.ts` is not reachable from any route yet. This is the extent of what's provable pre-deployment, per tasks.md Unit 1's own stated runtime-harness value. |
| Rollback boundary | Revert `src/lib/redis.ts`, `tests/helpers/fakeRedis.ts`, `tests/helpers/fakeRedis.test.ts`, the `@upstash/redis` line in `package.json`/`package-lock.json`, and the 2 new lines + comment block in `.env.example`. Nothing else references any of these yet — a clean, isolated revert. |

## Full-Suite Regression Check

- `npx vitest run` (full suite): **42 files / 278 tests, all passed.** Before this phase: 41 files / 270 tests. The only delta is the 8 new self-contained `fakeRedis.test.ts` tests — every pre-existing test file's pass/fail status is unchanged, confirming nothing was wired into any real call site.
- `npx tsc --noEmit`: clean, zero errors, across the whole project.

## Deviations from Design

None — implementation matches design.md's File Changes table and Architecture Decisions (`Client construction`, `Test double` rows) exactly. `getRedis()`'s signature, `fakeRedis.ts`'s surface (`get`/`set`/`del`/`__reset`), and the `.env.example` var names all match the design/tasks artifacts verbatim.

## Issues Found

None.

## Remaining Tasks (Phases B–E, NOT started this batch)

- [ ] Phase B: `src/cycle/latest.ts` async/Redis conversion (the production bug fix) — PR2
- [ ] Phase C: `src/narrative/cache.ts` async/Redis conversion — PR3
- [ ] Phase D: Route wiring (`await`, `502 CACHE_WRITE_FAILED`) + remaining test updates — PR4
- [ ] Phase E: Final full-suite verification + `[MANUAL-VERIFICATION-ONLY]` Upstash provisioning/deploy gate

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 1 (PR1) — Redis client + fake test double
- Boundary: starts from a clean baseline (no prior presentation-cache-persistence code existed), ends with `src/lib/redis.ts` + `tests/helpers/fakeRedis.ts` + their self-test, `package.json`/`.env.example` additions — self-contained, zero real callers
- Estimated review budget impact: small — 3 new files (~130 lines total incl. tests/comments) + 2 mechanical file edits (~10 lines); well under the 400-line budget on its own

## Status

6/6 Phase A tasks complete. Ready for Phase B (`sdd-apply` again with the same change, next work unit). NOT ready for `sdd-verify` yet — 3 code phases (B, C, D) remain before the full change is complete. Not committed/pushed — orchestrator holds commit and the full A→D push per the chained-delivery/production-safety plan.

---

# Phase B of 4 (+ manual verification): `src/cycle/latest.ts` Conversion (PR2 — the production bug fix)

## Mode

Strict TDD Mode: active project-wide. Genuine RED→GREEN behavior change (async, Redis-backed rewrite of a previously synchronous, in-memory module) — full TDD cycle followed, no mechanical/no-test exceptions in this phase.

## Completed Tasks (Phase B — all 3)

- [x] B.1 Rewrote `tests/cycle/latest.test.ts` against `tests/helpers/fakeRedis.ts` (`vi.mock('@/src/lib/redis', () => ({ getRedis: () => fakeRedis }))`), replacing every `atMs` argument with `vi.useFakeTimers()`/`vi.setSystemTime()`. Kept the original 6 scenarios (cross-market isolation both directions, independent-TTL expiry, `getForAsset` market isolation both directions, `clear()`), and added: 2 Redis key-scheme assertions (`cycle:latest:{market}` exact key, verified by reading directly through `fakeRedis.get`), 2 fail-open-on-read-error tests (`get`/`getForAsset` via `vi.spyOn(fakeRedis, 'get').mockRejectedValueOnce(...)`), and 1 put-error-propagation test (`vi.spyOn(fakeRedis, 'set').mockRejectedValueOnce(...)` → `cache.put(...)` must reject, not swallow). Confirmed RED: all 11/11 tests failed against the not-yet-converted (synchronous, in-memory) `latest.ts` — failures were `TypeError: You must provide a Promise to expect() when using .resolves/.rejects, not 'object'/'undefined'` (old module returns bare values, not Promises, and never touches Redis) plus one genuine `AssertionError: expected null not to be null` on the key-scheme test — the right reason (new behavior not implemented yet), not an infrastructure/typo failure.
- [x] B.2 Converted `src/cycle/latest.ts`: `put`/`get`/`getForAsset`/`clear` are now `async`, backed by `getRedis()` from `src/lib/redis.ts`. `put(market, report, ttlMs)` calls `getRedis().set(\`cycle:latest:${market}\`, JSON.stringify(report), { ex: Math.max(1, Math.ceil(ttlMs / 1000)) })` and does NOT catch errors — write failures propagate to the caller (design.md's Write failure handling decision; Phase D wraps this in the route's `try/catch` → `502 CACHE_WRITE_FAILED`, not implemented here). `get` wraps its Redis read + `JSON.parse` in `try/catch` and returns `null` on any error (fail-open, design.md's Read failure handling decision — indistinguishable from a genuine miss). `getForAsset` delegates to `get` (inherits its fail-open behavior with no separate catch needed). `clear()` is test-only: iterates a local `MARKETS: readonly Market[] = ['crypto', 'acciones']` constant and issues one `redis.del(key)` per market (there is no `KEYS`/`SCAN` in the minimal client surface used, so full-cache-clear needs an explicit enumeration — `Market` only has 2 values, both known at this project's current scope). The `atMs` parameter is removed entirely from all 4 functions' signatures.
- [x] B.3 Verified GREEN: `npx vitest run tests/cycle/latest.test.ts` → 11/11 passed. `npx tsc --noEmit` → 4 pre-existing-shape errors, all confined to `app/api/decisions/[asset]/narrative/route.ts` (lines 210, 218, 223, 235) — this file dereferences `.recommendation`/`.t` directly off `cycleCache.getForAsset(...)`'s return value without `await`, which is now `Promise<Decision | null>` instead of `Decision | null`, so property access is a genuine `TS2339`/`TS2345` compile error there (NOT just silent runtime truthiness breakage). `app/api/decisions/route.ts` and `app/api/cycle/route.ts` still compile cleanly — they only check the unawaited return value's truthiness / discard it, which type-checks against a `Promise` (always truthy / unused) even though it is behaviorally wrong. All 4 errors are confined to Phase D's explicit scope (route wiring) — deferred, not fixed in this phase per the assigned scope boundary.

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `src/cycle/latest.ts` | Modified | Converted `put`/`get`/`getForAsset`/`clear` to `async`, Redis-backed via `getRedis()`; key scheme `cycle:latest:{market}`; native `EX` TTL; fail-open reads; propagating writes; dropped `atMs`. |
| `tests/cycle/latest.test.ts` | Modified (rewritten) | Full rewrite against `fakeRedis` + fake timers; 11 tests (6 original scenarios + 2 key-scheme + 2 fail-open-read + 1 put-error-propagation). |
| `openspec/changes/presentation-cache-persistence/tasks.md` | Modified | Marked B.1–B.3 `[x]`. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| B.1/B.2 `src/cycle/latest.ts` | `tests/cycle/latest.test.ts` | Unit | ✅ N/A — full-file rewrite of the module under test itself (no separate untouched baseline to protect; the pre-change 6 scenarios were preserved as regression coverage, all passed post-conversion) | ✅ Written first — 11/11 failed against unconverted `latest.ts`, for the right reason (`.resolves`/`.rejects` type errors + one real assertion failure) | ✅ 11/11 passed after conversion (`npx vitest run tests/cycle/latest.test.ts`) | ✅ 11 cases across 4 behavior groups: cross-market isolation (2), independent TTL expiry (1), `getForAsset` isolation (2), `clear()` (1), key scheme (2), fail-open read (2), put-error propagation (1) — spans both markets, both hit/miss paths, and both success/failure Redis outcomes | ✅ Doc comment rewritten to explain Redis-backed rationale (cross-instance visibility, fail-open, push-only ingestion); `keyFor()` extracted as a small pure helper to avoid repeating the key-template string in 4 places |

### Test Summary
- **Total tests written**: 11 (full rewrite of `tests/cycle/latest.test.ts`)
- **Total tests passing**: 11/11
- **Layers used**: Unit (11)
- **Approval tests** (refactoring): None — this was a behavior-changing rewrite (sync→async, in-memory→Redis), not a pure refactor, so approval-testing the OLD synchronous behavior was not applicable; the pre-existing 6 scenarios were instead carried forward as regression coverage under the new async API.
- **Pure functions created**: 1 (`keyFor(market): string`)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/cycle/latest.test.ts` → 1 file, 11/11 tests passed |
| Runtime harness command/scenario and exact result | N/A — real cross-instance Redis behavior is unprovable locally; proven only by Phase E's manual Upstash gate, per tasks.md Unit 2's own stated runtime-harness value. `npx tsc --noEmit` run as the closest available static-check harness: clean except for the 4 expected, Phase-D-scoped errors in `narrative/route.ts` (documented above). |
| Rollback boundary | Revert `src/cycle/latest.ts` and `tests/cycle/latest.test.ts` only. Route callers (`app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `app/api/decisions/[asset]/narrative/route.ts`) were not touched this phase and remain unconverted — reverting this phase's 2 files returns the project to the exact Phase-A-complete state. |

## Full-Suite Regression Check

- `npx vitest run` (full suite): **42 files, 283 tests total → 39 files/264 tests passed, 3 files/19 tests FAILED.** This is EXPECTED, not a regression: the 3 failing files call the now-async `src/cycle/latest.ts` synchronously (via `tests/helpers/seedCycleCache.ts` and direct route calls) without `await`, which is exactly the deferred-to-Phase-D breakage window documented in tasks.md's "Delivery Route Recommendation" section. The 3 failing files, listed explicitly per the orchestrator's request for independent re-verification:
  - `tests/api/decisions.test.ts` (4 tests failed) — `seedCycleCache` calls `cache.put` without `await`; the route's `cache.get(market)` returns an unawaited `Promise` (always truthy) so it never reaches the intended `503 NO_DATA` branch, and in several cases the *real* `getRedis()`/`Redis.fromEnv()` gets invoked (no env vars set in this test env) producing unhandled-rejection noise (`Exhausted all retries`, `Failed to parse URL from /pipeline`) surfaced separately in the run's "Unhandled Errors" section — this file does not mock `@/src/lib/redis` at all yet, which is exactly what Phase D is scoped to add.
  - `tests/api/decisions-invariance.test.ts` (1 test failed) — same root cause (unawaited `seedCycleCache`/`cache.get`).
  - `tests/api/narrative.test.ts` (14 tests failed) — `cycleCache.getForAsset(...)` is called without `await` in `app/api/decisions/[asset]/narrative/route.ts`, so `buildNarrativeFacts(decision)` receives a `Promise` instead of a `Decision`, and `decision.bullish.net`/`decision.bearish.net` throw `TypeError: Cannot read properties of undefined (reading 'net')` — this is the runtime manifestation of the same root cause as the 4 `tsc --noEmit` compile errors in this file (both stem from the unawaited `getForAsset` call).
  - NOT failing (confirmed unaffected): `tests/api/cycle.test.ts`, `tests/cycle/idempotency.test.ts`, `tests/narrative/*.test.ts`, and all other 36 previously-passing files — their assertions do not synchronously dereference the cache's return value in a way that surfaces the Promise-vs-value mismatch.
- `npx tsc --noEmit`: 4 errors, all in `app/api/decisions/[asset]/narrative/route.ts` (lines 210, 218, 223, 235) — see B.3 above and Issues Found below. Zero errors anywhere else in the project, including `src/cycle/latest.ts` itself and all 42 test files.

## Deviations from Design

None in the production code — `src/cycle/latest.ts` matches design.md's `Interfaces / Contracts` section verbatim (function names, arity, `Promise` return types, key scheme, TTL formula, error-handling split between `put`/`get`). One clarification beyond what design.md/tasks.md spelled out: `clear()`'s implementation approach (enumerate a local `MARKETS` constant and `del` each key) was not specified in either artifact beyond the interface signature — chosen because the fake/real Redis client surface used by this module (`get`/`set`/`del`) has no pattern-based bulk-delete (`KEYS`/`SCAN`), and `Market` is a closed 2-value union, making explicit enumeration the simplest correct option. Flagging this as a design gap-fill, not a deviation from a stated decision.

## Issues Found

1. **The Delivery Route Recommendation's "the routes will type-check" claim is only partially true.** `app/api/decisions/route.ts` and `app/api/cycle/route.ts` do still type-check with the unawaited async call (Promise truthiness / discarded return value are both valid TS). However, `app/api/decisions/[asset]/narrative/route.ts` does NOT type-check as of this phase — it directly dereferences `.recommendation`/`.t` off `cycleCache.getForAsset(...)`'s result, which is a genuine `TS2339`/`TS2345` compile error against `Promise<Decision | null>`, not just a runtime behavior regression. This means `npx tsc --noEmit` is NOT fully clean right now (4 errors, all in that one file) — flagging explicitly since the task instructions characterized cross-phase breakage as "still compiles". This is still squarely Phase D's scope to fix (the file is explicitly out of this phase's edit boundary) and does not indicate anything wrong with Phase B's implementation; it just narrows the "known, expected, temporary breakage" characterization for that specific file from "runtime-only" to "compile-time + runtime".
2. No other issues. `src/lib/redis.ts` and `tests/helpers/fakeRedis.ts` (Phase A) required zero changes — both were consumed exactly as designed.

## Remaining Tasks (Phases C–E, NOT started this batch)

- [ ] Phase C: `src/narrative/cache.ts` async/Redis conversion — PR3
- [ ] Phase D: Route wiring (`await`, `502 CACHE_WRITE_FAILED`) + remaining test updates (including the 3 files now failing above) — PR4
- [ ] Phase E: Final full-suite verification + `[MANUAL-VERIFICATION-ONLY]` Upstash provisioning/deploy gate

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 2 (PR2) — `src/cycle/latest.ts` conversion, the production bug fix itself
- Boundary: starts from Phase A's clean baseline (0c5dc0f, not pushed); ends with `src/cycle/latest.ts` + `tests/cycle/latest.test.ts` converted to async/Redis, self-contained; route callers remain unconverted (Phase D)
- Estimated review budget impact: small-to-medium — 1 production file rewritten (~90 lines incl. comments) + 1 test file rewritten (~175 lines); well under the 400-line budget on its own

## Status

3/3 Phase B tasks complete (9/26 total tasks across all phases: A's 6 + B's 3). Ready for Phase C (`sdd-apply` again with the same change, next work unit). NOT ready for `sdd-verify` yet — 2 code phases (C, D) remain before the full change is complete. Not committed/pushed — orchestrator holds commit and the full A→D push per the chained-delivery/production-safety plan. `npx tsc --noEmit` currently shows 4 errors (all in `narrative/route.ts`, Phase D scope) and the full test suite shows 3 failing files / 19 failing tests (all Phase-D-scoped, listed above) — both expected and unresolved until Phase D lands, per this change's explicit chained-PR strategy.
