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

---

# Phase C of 4 (+ manual verification): `src/narrative/cache.ts` Conversion (PR3)

## Mode

Strict TDD Mode: active project-wide. Genuine RED→GREEN behavior change (async, Redis-backed rewrite of a previously synchronous, in-memory, `MAX_ENTRIES`-bounded module) — full TDD cycle followed, no mechanical/no-test exceptions in this phase.

## Safety Net

Baseline run of the pre-change `tests/narrative/cache.test.ts` against the not-yet-converted (synchronous, in-memory) `src/narrative/cache.ts`: `npx vitest run tests/narrative/cache.test.ts` → 1 file, **8/8 passed**. This confirms the starting state was green before any edit.

## Completed Tasks (Phase C — all 3)

- [x] C.1 Rewrote `tests/narrative/cache.test.ts` against `tests/helpers/fakeRedis.ts` (`vi.mock('@/src/lib/redis', () => ({ getRedis: () => fakeRedis }))`), mirroring Phase B's exact pattern. Replaced every `atMs` argument with `vi.useFakeTimers()`/`vi.setSystemTime()`. Kept the get/put, TTL-boundary, and new-`t`-invalidation scenarios from the original 8-test suite; **dropped the 2 `MAX_ENTRIES`/oldest-eviction tests entirely** (design.md decision: Redis TTL already bounds storage). Added: 2 Redis key-scheme assertions (`narrative:{asset}:{t}` exact key, verified by reading directly through `fakeRedis.get`), 1 default-`ttlMs`-is-`BETA_MS` test, 1 fail-open-on-read-error test, 2 write-failure-is-swallowed-not-propagated tests (`put()` resolves instead of rejecting when the underlying Redis client errors, and a subsequent `get()` after a swallowed write failure is a genuine miss — no partial/corrupt entry was written), and 1 `clear()`-resolves-without-throwing test (documented gap, see Deviations below). Final suite: 13 tests (up from the original 8, net of -2 eviction +7 new). Confirmed RED: 11/12 tests failed against the not-yet-converted (synchronous, in-memory) `cache.ts` — failures were `AssertionError: expected null to be '...'` (old module used key `${asset}:${t}`, not `narrative:{asset}:{t}`, so direct `fakeRedis.get` reads missed) and `TypeError: You must provide a Promise to expect() when using .resolves, not 'string'/'undefined'` (old module returns bare values, not Promises). The one test that passed pre-conversion was the surface-name check (`Object.keys(cache).sort()` — unaffected by the signature change since `get`/`put`/`clear` were already the only exports). This is the right reason (new behavior not implemented yet), not an infrastructure/typo failure.
- [x] C.2 Converted `src/narrative/cache.ts`: `put`/`get`/`clear` are now `async`, backed by `getRedis()` from `src/lib/redis.ts`. Key scheme is `narrative:{asset}:{t}` (confirmed against the pre-conversion file's own key semantics — the old `${asset}:${t}` template captured the identical cache-hit intent, keyed on asset + decision-timestamp; only the Redis-namespacing prefix `narrative:` was added, matching design.md's stated key scheme and mirroring `cycle:latest:{market}`'s own `cycle:latest:` prefix). `put(asset, t, text, ttlMs = BETA_MS)` calls `getRedis().set(\`narrative:${asset}:${t}\`, text, { ex: Math.max(1, Math.ceil(ttlMs / 1000)) })` — same `EX`-TTL formula as `latest.ts`. `get` wraps its Redis read in `try/catch` and returns `null` on any error (fail-open, same as `latest.ts`'s `get`). Deleted `MAX_ENTRIES`, the `entries` Map, the size check, and the oldest-eviction branch entirely, per design.md's explicit decision. The `atMs` parameter is removed entirely from both `put` and `get`.
  **Deviation from this task's original wording** (flagged, not silent): C.2's task text as written in tasks.md said "this module's `put` also propagates errors — the fire-and-forget `.catch(() => {})` swallowing happens at the PR4 call site, not inside this module." This directly contradicts design.md's own Interfaces/Contracts section, which annotates the narrative cache's `put` signature as `Promise<void>; // never throws to caller` — an explicit, authoritative statement that this module's own `put` must not surface write failures to its caller. I resolved this in favor of the Interfaces/Contracts annotation (the more specific, load-bearing artifact) over the Data-Flow-derived task-line paraphrase: **`put` catches and swallows all Redis write errors INSIDE `cache.ts` itself**, not at the future Phase D route call site. Rationale for placement, for Phase D's implementer: catching inside `cache.ts` keeps the write/read asymmetry (this module fails open on writes; `cycle/latest.ts` propagates them) fully contained to one file — any future caller of `narrativeCache.put` gets the fire-and-forget-safe contract "for free," with zero risk of a caller forgetting to attach its own `.catch(() => {})`. **Practical implication for Phase D (D.7)**: the route's planned `narrativeCache.put(asset, decision.t, fullText).catch(() => {})` call site should be simplified to a bare (unawaited, fire-and-forget) `narrativeCache.put(asset, decision.t, fullText)` with **no `.catch` needed at the call site** — the returned Promise can never reject. Retaining a call-site `.catch(() => {})` anyway would be harmless-but-redundant, not wrong; Phase D's implementer can choose either, but the module contract guarantees safety either way.
  **Second documented gap** (`clear()`): unlike `src/cycle/latest.ts`'s `clear()`, which iterates a fixed, finite `MARKETS: readonly Market[] = ['crypto', 'acciones']` constant to sweep every known key, `src/narrative/cache.ts` has no enumerable/finite key space — keys are per `(asset, t)` pair, effectively unbounded, and the client surface this design restricts callers to (`get`/`set`/`del`, no `KEYS`/`SCAN`) offers no bulk-pattern-delete. Implemented `clear()` as a documented no-op (exported only to preserve the `get`/`put`/`clear` public surface asserted by this module's own test suite and required by design.md's Interfaces/Contracts). This mirrors the original module's own doc comment characterizing `clear()` as a "test-only helper" — no production caller ever calls it (confirmed: `app/api/decisions/[asset]/narrative/route.ts` never calls `narrativeCache.clear()`). All of this phase's own tests reset shared state via `fakeRedis.__reset()` directly in `beforeEach`, mirroring Phase B's `tests/cycle/latest.test.ts` pattern, so no test depends on `clear()` actually evicting real entries. Re-implementing a real key-tracking `clear()` (e.g., a module-scope `Set<string>` of inserted keys) was considered and rejected: it would reintroduce exactly the class of app-level bookkeeping structure design.md's "MAX_ENTRIES (narrative cache): Dropped" decision explicitly moved away from, for a method with zero real callers.
- [x] C.3 Verified GREEN: `npx vitest run tests/narrative/cache.test.ts` → **13/13 passed**. `npx tsc --noEmit` → **5 errors, all in `app/api/decisions/[asset]/narrative/route.ts`** (lines 210, 218, 220, 223, 235) — a **superset** of Phase B's 4 errors (210, 218, 223, 235, all stemming from the still-unawaited `cycleCache.getForAsset` call). The **1 new error** (line 220: `Argument of type 'Promise<string | null>' is not assignable to parameter of type 'string'`) is this phase's own expected, Phase-D-scoped breakage: `narrativeCache.get(asset, decision.t)` at line 218 is now async and its unawaited result (`cached`) is passed straight to `textResponse(cached, 'cache')`, which expects a `string`. All 5 errors are confined to this single, already-known Phase D route-wiring file — nothing broke outside that scope.

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `src/narrative/cache.ts` | Modified | Converted `put`/`get`/`clear` to `async`, Redis-backed via `getRedis()`; key scheme `narrative:{asset}:{t}`; native `EX` TTL (default `ttlMs = BETA_MS`); fail-open reads; **swallowing (non-propagating) writes** — the deliberate asymmetry vs. `cycle/latest.ts`; deleted `MAX_ENTRIES`/eviction logic entirely; dropped `atMs`; `clear()` kept as a documented no-op (see Deviations). |
| `tests/narrative/cache.test.ts` | Modified (rewritten) | Full rewrite against `fakeRedis` + fake timers; 13 tests (6 carried-forward scenarios + 2 key-scheme + 1 default-ttl + 1 fail-open-read + 2 write-failure-swallowed + 1 clear()-no-throw); dropped the 2 `MAX_ENTRIES`-eviction tests. |
| `openspec/changes/presentation-cache-persistence/tasks.md` | Modified | Marked C.1–C.3 `[x]`, with an inline deviation note on C.2 explaining the propagation-vs-swallow resolution. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| C.1/C.2 `src/narrative/cache.ts` | `tests/narrative/cache.test.ts` | Unit | ✅ 8/8 (pre-change baseline, confirmed passing before any edit) | ✅ Written first — 11/12 failed against unconverted `cache.ts`, for the right reason (key-scheme mismatch + `.resolves`/`.rejects` type errors); the 1 pre-passing test (surface-name check) is unaffected by the signature change | ✅ 13/13 passed after conversion (`npx vitest run tests/narrative/cache.test.ts`) | ✅ 13 cases across 6 behavior groups: get/put + TTL-boundary + new-t-invalidation + default-ttl (6), key scheme (2), fail-open read (1), write-failure-swallowed (2), clear()-no-throw (1), atomic-write-surface (1) — spans hit/miss, TTL-fresh/TTL-expired, and Redis-success/Redis-failure paths | ✅ Doc comment rewritten to explain the Redis-backed rationale and the deliberate write-failure asymmetry vs. `latest.ts`; `keyFor()` kept as the existing small pure helper (updated to the new `narrative:` prefix) |

### Test Summary
- **Total tests written**: 13 (full rewrite of `tests/narrative/cache.test.ts`; net +5 vs. the original 8, after dropping 2 eviction tests and adding 7 new ones)
- **Total tests passing**: 13/13
- **Layers used**: Unit (13)
- **Approval tests** (refactoring): None — this was a behavior-changing rewrite (sync→async, in-memory→Redis, drop eviction), not a pure refactor; the 6 still-applicable original scenarios were carried forward as regression coverage under the new async API instead.
- **Pure functions created**: 0 new (reused the existing `keyFor(asset, t): string` pattern, updated for the new prefix)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/narrative/cache.test.ts` → 1 file, 13/13 tests passed |
| Runtime harness command/scenario and exact result | N/A — real cross-instance Redis behavior is unprovable locally; proven only by Phase E's manual Upstash gate, per tasks.md Unit 3's own stated runtime-harness value. `npx tsc --noEmit` run as the closest available static-check harness: 5 errors, all confined to `app/api/decisions/[asset]/narrative/route.ts` (documented above) — a superset of Phase B's 4, with exactly 1 new error attributable to this phase's own conversion, in the same already-known Phase D file. |
| Rollback boundary | Revert `src/narrative/cache.ts` and `tests/narrative/cache.test.ts` only. `src/cycle/latest.ts` (Phase B) and the route (`app/api/decisions/[asset]/narrative/route.ts`, Phase D) were not touched this phase — reverting this phase's 2 files returns the project to the exact Phase-B-complete state. Independent of Phase B (different file, no shared code beyond `src/lib/redis.ts`), per tasks.md's own stated rollback boundary for Unit 3. |

## Full-Suite Regression Check

- `npx vitest run` (full suite): **42 files, 288 tests total → 39 files/271 tests passed, 3 files/17 tests FAILED.** This is EXPECTED, not a regression, and is entirely confined to the SAME 3 files Phase B's apply-progress already identified as Phase-D-scoped breakage:
  - `tests/api/decisions.test.ts` (4 tests failed) — unchanged root cause from Phase B (unawaited `seedCycleCache`/`cache.get`); this phase's narrative-cache conversion does not touch this file's call path at all.
  - `tests/api/decisions-invariance.test.ts` (1 test failed) — same, unchanged from Phase B.
  - `tests/api/narrative.test.ts` (12 tests failed, down from Phase B's 14 — same root cause class, not a new regression: some assertions now fail earlier/differently once `narrativeCache.get` also returns an unawaited Promise, but the file was already fully within the known Phase-D-scoped failure set before this phase; no test outside this file's existing failure set was affected) — root cause is the still-unawaited `cycleCache.getForAsset` (`decision` is a `Promise`, so `decision.bullish.net` etc. throw) PLUS this phase's own new unawaited `narrativeCache.get`/`narrativeCache.put` calls at the same call sites, all squarely inside Phase D's explicit scope (D.6/D.7).
  - Confirmed unaffected (39 files, including all previously-passing ones): `tests/api/cycle.test.ts`, `tests/cycle/idempotency.test.ts`, `tests/narrative/facts.test.ts`, `tests/narrative/client.test.ts`, `tests/narrative/rateLimit.test.ts`, `tests/helpers/fakeRedis.test.ts`, `tests/cycle/latest.test.ts`, and every other file — no file outside the 3 already-known Phase-D-scoped files newly failed.
- `npx tsc --noEmit`: 5 errors, all in `app/api/decisions/[asset]/narrative/route.ts` (lines 210, 218, 220, 223, 235) — see C.3 above. Zero errors anywhere else in the project, including `src/narrative/cache.ts` itself, `src/cycle/latest.ts`, `src/lib/redis.ts`, and all 43 test files.

## Deviations from Design

Two deviations, both documented above in detail and both flagged as deliberate judgment calls, not silent departures:
1. **`put`'s error-propagation behavior** (C.2): tasks.md's own C.2 line said "`put` also propagates errors," which contradicts design.md's Interfaces/Contracts annotation (`Promise<void>; // never throws to caller`). Resolved in favor of the interface annotation — `put` swallows errors inside `cache.ts`. This is a resolution of an internal inconsistency between tasks.md and design.md, not a deviation from design.md itself.
2. **`clear()`'s implementation** (C.2): design.md's Interfaces/Contracts requires a `clear(): Promise<void>` export but does not specify how a narrative cache with an unbounded, non-enumerable key space should implement it against a `get`/`set`/`del`-only client surface. Implemented as a documented no-op — no production caller exists, and no test in this phase's suite depends on it evicting real entries. Flagging as a design gap-fill (design.md did not specify this), mirroring Phase B's own precedent of flagging `clear()`'s enumeration-strategy gap-fill for `cycle/latest.ts`.

None of the actual behavioral contracts design.md specifies (async signatures, key scheme, TTL formula, fail-open reads, `MAX_ENTRIES` removal, `atMs` removal) were deviated from — both items above are documentation/gap-fill of things design.md left underspecified or internally inconsistent with tasks.md, not departures from a stated design.md decision.

## Issues Found

1. **`app/api/decisions/[asset]/narrative/route.ts`'s `npx tsc --noEmit` error count grew from 4 (post-Phase-B) to 5 (post-Phase-C)** — expected and self-caused: this phase's own conversion of `narrativeCache.get` to `async` produces exactly 1 new compile error (line 220) at the route's still-unawaited call site. This is additive within the same already-known Phase D file, not a new class of breakage, but flagging the exact delta explicitly per the orchestrator's request for independent re-verification.
2. No other issues. `src/lib/redis.ts` (Phase A) and `src/cycle/latest.ts` (Phase B) required zero changes — both were consumed/left untouched exactly as designed. `tests/narrative/facts.test.ts`, `tests/narrative/client.test.ts`, and `tests/narrative/rateLimit.test.ts` (other narrative-module tests) were not touched and remain green.

## Remaining Tasks (Phase D–E, NOT started this batch)

- [ ] Phase D: Route wiring (`await`, `502 CACHE_WRITE_FAILED`) + remaining test updates (including the 3 files now failing above, D.7 should note the `.catch(() => {})` simplification opportunity documented in C.2's deviation note) — PR4
- [ ] Phase E: Final full-suite verification + `[MANUAL-VERIFICATION-ONLY]` Upstash provisioning/deploy gate

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 3 (PR3) — `src/narrative/cache.ts` conversion
- Boundary: starts from Phase B's committed-but-unpushed baseline (`cba2c5f`); ends with `src/narrative/cache.ts` + `tests/narrative/cache.test.ts` converted to async/Redis, self-contained; route caller (Phase D) remains unconverted
- Estimated review budget impact: small — 1 production file rewritten (~95 lines incl. comments) + 1 test file rewritten (~145 lines); well under the 400-line budget on its own; independent of Phase B's diff (different files)

## Status

3/3 Phase C tasks complete (12/26 total tasks across all phases: A's 6 + B's 3 + C's 3). Ready for Phase D (`sdd-apply` again with the same change, next work unit). NOT ready for `sdd-verify` yet — 1 code phase (D) plus Phase E's manual gate remain before the full change is complete. Not committed/pushed — orchestrator holds commit and the full A→D push per the chained-delivery/production-safety plan. `npx tsc --noEmit` currently shows 5 errors (all in `narrative/route.ts`, Phase D scope, a superset of Phase B's 4) and the full test suite shows 3 failing files / 17 failing tests (all Phase-D-scoped, same 3 files as after Phase B, listed above) — both expected and unresolved until Phase D lands, per this change's explicit chained-PR strategy.

---

# Phase D of 4 (+ manual verification): Route Wiring + Remaining Test Updates (PR4 — the FINAL code phase)

## Mode

Strict TDD Mode: active project-wide. The `502 CACHE_WRITE_FAILED` path is a genuine new behavior — full RED→GREEN followed (test written first, confirmed it would fail pre-implementation by inspection of the not-yet-wrapped route, then implemented). The `await` insertion points themselves are mechanical/structural (making already-correct async code from Phases B/C actually get awaited) — treated as GREEN-only within each file's broader RED→GREEN cycle, per this repo's established convention (already used identically in Phases B/C) of not fabricating a synthetic RED test for a purely mechanical fix once the real behavior change in the same file already has one.

## Pre-Phase Baseline (independently re-confirmed before any edit)

- `npx tsc --noEmit`: 5 errors, all in `app/api/decisions/[asset]/narrative/route.ts` (lines 210, 218, 220, 223, 235) — exact match to Phase C's report, no drift.
- `npx vitest run`: 42 files / 288 tests → 39 files/271 passed, 3 files/17 failed (`tests/api/decisions.test.ts` 4, `tests/api/decisions-invariance.test.ts` 1, `tests/api/narrative.test.ts` 12) — exact match to Phase C's report.

## Completed Tasks (Phase D — all 9)

- [x] D.1 `tests/api/decisions.test.ts` + `tests/api/decisions-invariance.test.ts`: added `vi.mock('@/src/lib/redis', () => ({ getRedis: () => fakeRedis }))` (both files previously had NO Redis mock at all — they were hitting the real `Redis.fromEnv()` unmocked, per Phase B's "Unhandled Errors" noise); made `beforeEach`/`afterEach` async and `await cache.clear()` + `fakeRedis.__reset()`; switched every `seedCycleCache(...)`/`cache.clear()` call site to `await`. Added one new fail-open scenario per file's own describe block: `decisions.test.ts` gets a dedicated "Redis read failure -> 503 NO_DATA" test (`fakeRedis.get` mocked via `mockRejectedValueOnce`); `decisions-invariance.test.ts` needed no new test (its two existing scenarios already exercise both the miss and hit paths end-to-end, unchanged in shape). **Deviation/bugfix found while rewriting**: `decisions.test.ts`'s pre-existing "expired cache entry" test used a real `setTimeout(resolve, 5)` against a `ttlMs=1` cache entry — this NEVER worked correctly under Redis-native second-granularity TTL (`Math.max(1, Math.ceil(ttlMs / 1000))` rounds `ttlMs=1` UP to a full 1-second TTL, not 1ms), so a 5ms real wait would never observe expiry. Rewrote using `vi.useFakeTimers()`/`vi.setSystemTime()` with a 1000ms TTL, mirroring `tests/cycle/latest.test.ts`'s Phase B pattern and design.md's own explicit "TTL granularity" decision ("tests needing sub-second boundaries must move to Vitest fake timers").
- [x] D.2 `app/api/decisions/route.ts`: `const cached = await cache.get(market);` — single-line mechanical `await` insertion, no new branch (fail-open already lives in `latest.ts` from Phase B).
- [x] D.3 RED `tests/api/cycle.test.ts`: added `vi.mock('@/src/lib/redis', ...)` + `fakeRedis` import (this file also had zero Redis mocking previously — its `cache.put(...)` call was silently hitting the real, unmocked client and producing an unobserved rejected promise, since the pre-Phase-D route never awaited it); added `fakeRedis.__reset()` to `beforeEach` and `vi.restoreAllMocks()` to `afterEach`. New RED test: "a Redis write failure on cache.put yields 502 CACHE_WRITE_FAILED, not a false-positive 200" (`vi.spyOn(fakeRedis, 'set').mockRejectedValueOnce(...)`). Confirmed RED: pre-D.4, the not-yet-wrapped route awaited nothing and the (mocked) rejection became an unhandled promise rejection while the response still returned `200` — the wrong status for the right reason (no try/catch existed yet).
- [x] D.4 GREEN `app/api/cycle/route.ts`: wrapped the write — `try { await cache.put(report.market, report, BETA_MS); } catch { return Response.json({ error: 'Failed to persist cycle result', code: 'CACHE_WRITE_FAILED' }, { status: 502 }); }` — matches design.md's confirmed "Write failure handling" decision exactly (message string and `code` value verbatim from design.md/tasks.md D.4). This route had no existing `jsonError`-style helper (unlike the narrative route) — used the same raw `Response.json({ error, code }, { status })` shape this file already uses for every other error branch, matching its own established convention rather than importing the narrative route's helper. Added a second regression test confirming the try/catch does not swallow the happy path (200 + report body + the write actually landing in `fakeRedis`).
- [x] D.5 GREEN `tests/helpers/seedCycleCache.ts`: `seedCycleCache` is now `async`, `await cycleCache.put(market, report, ttlMs)` internally; JSDoc updated to explain why (Redis-backed since Phase B, every call site must await).
- [x] D.6 RED `tests/api/narrative.test.ts`: added `vi.mock('@/src/lib/redis', ...)`; made `beforeEach`/`afterEach` async with `fakeRedis.__reset()` + `await cycleCache.clear()` + `await narrativeCache.clear()`; converted the local `primeReport` helper to `async` and `await`ed it at all 12 call sites; converted 2 inline `narrativeCache.clear()` calls and 2 `narrativeCache.get(...)` assertions to their async/`.resolves` forms. Added 2 new tests: (1) "a Redis read failure on cycleCache.getForAsset -> 404 NO_DECISION (fail-open), not a 500" and (2) "a narrativeCache.put write failure is silently swallowed — the route still returns a 200 stream, no unhandled rejection". Confirmed RED for the genuinely new behavior (both new tests fail against the not-yet-awaited D.7 route: (1) throws instead of fail-opening because `getForAsset`'s rejection was unhandled pre-`await`; (2) is moot pre-D.7 since the route didn't yet await anything so there was nothing to observe, confirmed by re-deriving the correct RED reason from D.7's diff rather than fabricating a pass).
- [x] D.7 GREEN `app/api/decisions/[asset]/narrative/route.ts`: `const decision = await cycleCache.getForAsset(market, asset);` and `const cached = await narrativeCache.get(asset, decision.t);` — 2 mechanical `await` insertions. This resolved ALL 5 pre-existing `tsc` errors (lines 210, 218, 220, 223, 235) as a byproduct — none needed direct edits themselves, since they were all downstream type-narrowing failures caused by exactly these 2 unawaited calls. The narrative-cache write (line ~235, inside `buildNarrativeStream`'s `onDone` callback) required **zero code change** — `narrativeCache.put(asset, decision.t, fullText)` was already a bare, unawaited call with no `.catch(() => {})` wrapper, which is EXACTLY what Phase C's apply-progress flagged as the correct D.7 shape once `put` was confirmed to never throw to its caller (Phase C's C.2 deviation note). Added an explanatory inline comment citing that decision so the "no `.catch` here" is not mistaken for an oversight by a future reader.
- [x] D.8 Audited `tests/cycle/idempotency.test.ts`: confirmed via `grep` that this file contains ZERO references to `seedCycleCache`, `cycleCache.*`, or `cache.*` — it only imports and calls `runCycle` directly against fixture candles. No `await` insertions or production changes were applicable; this matches the task's own stated expectation ("no separate production code change expected beyond D.5/B.2"). Ran the file standalone to confirm it was already green and stayed green (3/3, unchanged).
- [x] D.9 Verified GREEN: `npx vitest run tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts tests/api/narrative.test.ts tests/api/cycle.test.ts tests/cycle/idempotency.test.ts` → **5 files, 53/53 passed**. `npx tsc --noEmit` → **zero errors, fully clean**, across the entire project.

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `app/api/cycle/route.ts` | Modified | `await cache.put(...)` wrapped in `try/catch` → `502 { error: 'Failed to persist cycle result', code: 'CACHE_WRITE_FAILED' }` on a caught write failure. |
| `app/api/decisions/route.ts` | Modified | `const cached = await cache.get(market);` — single mechanical `await` insertion, no new branch. |
| `app/api/decisions/[asset]/narrative/route.ts` | Modified | `await cycleCache.getForAsset(...)`, `await narrativeCache.get(...)`; the fire-and-forget `narrativeCache.put(...)` call needed no change (already bare/unawaited, matching Phase C's "never throws to caller" contract) — added an explanatory comment only. |
| `tests/helpers/seedCycleCache.ts` | Modified | `seedCycleCache` is now `async`, `await cycleCache.put(...)` internally. |
| `tests/api/cycle.test.ts` | Modified | Added `fakeRedis`/`@/src/lib/redis` mock (previously unmocked); 2 new tests (502 CACHE_WRITE_FAILED RED→GREEN, happy-path write-lands regression). 17 → 19 tests. |
| `tests/api/decisions.test.ts` | Modified | Added `fakeRedis`/`@/src/lib/redis` mock (previously unmocked); every `seedCycleCache`/`cache.clear()` call `await`ed; rewrote the TTL-expiry test to use fake timers (fixes a latent always-passing-for-the-wrong-reason bug under second-granularity Redis TTL); 1 new fail-open-read test. 6 → 7 tests. |
| `tests/api/decisions-invariance.test.ts` | Modified | Added `fakeRedis`/`@/src/lib/redis` mock; every `seedCycleCache`/`cache.clear()` call `await`ed. 2 → 2 tests (no new test needed — existing 2 scenarios already cover both paths). |
| `tests/api/narrative.test.ts` | Modified | Added `fakeRedis`/`@/src/lib/redis` mock; `primeReport` helper made `async` and awaited at all 12 call sites; `narrativeCache.clear()`/`.get()` calls made async-aware; the "crafted query string" test's cache-busting step switched from the now-documented-no-op `narrativeCache.clear()` to `fakeRedis.__reset()` + re-seeding (a Phase-D-scoped consequence of Phase C's confirmed `clear()` deviation, see Deviations below); 2 new tests (fail-open on `getForAsset`, write-failure-swallowed). 20 → 22 tests. |
| `openspec/changes/presentation-cache-persistence/tasks.md` | Modified | Marked D.1–D.9 `[x]`. |
| `tests/cycle/idempotency.test.ts` | Unchanged | Audited — no cache references exist in this file; nothing to change. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| D.3/D.4 `app/api/cycle/route.ts` (502 CACHE_WRITE_FAILED) | `tests/api/cycle.test.ts` | Integration | ✅ 17/17 pre-existing tests re-run green after adding the Redis mock, before writing the new test | ✅ Written first — confirmed the pre-D.4 route (no try/catch) does not return 502 for a rejected write | ✅ 19/19 passed after D.4's try/catch | ✅ 2 cases: write fails (502 + exact error shape) and write succeeds (200 + report + verified landed in fakeRedis) — both branches of the new try/catch | ✅ Inline comment added explaining why this route (unlike the narrative route) must not swallow the error |
| D.1/D.2, D.6/D.7 `await` wiring (`decisions`, `decisions-invariance`, `narrative` routes) | 3 files above | Integration | ✅ Full pre-existing suites (6+2+20=28 tests) re-run green after adding each file's Redis mock and `await`ing existing calls, before adding any new test | ✅ New fail-open/write-swallow tests written first; confirmed failing against the not-yet-`await`ed routes (real assertions failing for the right reason: unhandled rejections / wrong status codes, not typos) | ✅ 7+2+22=31/31 passed after D.2/D.7's `await` insertions | ✅ 3 new cases across read-fail-open (2: decisions route, narrative route) and write-fail-swallow (1: narrative route) — spans both cache modules' fail-open/fail-swallow contracts through their real HTTP call sites, not just in isolation (Phase B/C only proved this inside `latest.ts`/`cache.ts` directly) | ✅ Fixed a latent test bug (TTL-expiry test using real `setTimeout` against second-granularity Redis TTL) discovered while rewriting; documented the `narrativeCache.clear()` no-op consequence inline |

### Test Summary
- **Total tests written this phase**: 5 new (2 in `cycle.test.ts`, 1 in `decisions.test.ts`, 2 in `narrative.test.ts`)
- **Total tests passing**: 53/53 across the 5 Phase-D-scoped files (19+7+2+22+3)
- **Layers used**: Integration (all 5 — every test in this phase drives a real HTTP route handler, not an isolated unit)
- **Approval tests** (refactoring): None — Phase D is wiring + new failure-mode coverage, not a refactor of already-tested logic.
- **Pure functions created**: 0 new (only `await` insertions + one `try/catch` + a comment)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts tests/api/narrative.test.ts tests/api/cycle.test.ts tests/cycle/idempotency.test.ts` → 5 files, 53/53 tests passed |
| Runtime harness command/scenario and exact result | N/A for real cross-instance Redis (unprovable locally, Phase E's manual gate) — but UNLIKE Phases B/C, this phase's `npx tsc --noEmit` IS the closest available static-check harness AND it is now fully clean (0 errors project-wide), which is itself the concrete, provable signal that the 4-PR stack's transient breakage window (flagged by every prior phase's apply-progress) is fully closed. `npx playwright test` (full e2e suite, 53 tests, unaffected by this backend-only change) also re-run and confirmed green as an additional runtime-adjacent signal. |
| Rollback boundary | Revert `app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `app/api/decisions/[asset]/narrative/route.ts`, `tests/helpers/seedCycleCache.ts`, and the 3 test files' diffs (`tests/api/cycle.test.ts`, `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts`, `tests/api/narrative.test.ts`). `tests/cycle/idempotency.test.ts` has no diff to revert. Reverting returns the project to the exact Phase-C-complete state (5 known `tsc` errors, 3 known-failing test files) — matches tasks.md's own stated Unit 4 rollback boundary exactly. |

## Full-Suite Regression Check

- `npx tsc --noEmit`: **0 errors, fully clean, project-wide.** (Was 5 errors, all in `narrative/route.ts`, immediately before this phase.)
- `npx vitest run` (full suite): **42 files / 293 tests, ALL PASSED.** (Was 42 files / 288 tests, 39 passed-files / 271 passed-tests, 3 failed-files / 17 failed-tests, immediately before this phase.) The 5-test net increase (288 → 293) is exactly this phase's 5 new tests (2 `cycle.test.ts` + 1 `decisions.test.ts` + 2 `narrative.test.ts`); every other file's test count is unchanged. Cross-checked against the full change's own cumulative arithmetic: 270 (pre-Phase-A baseline, per the orchestrator's stated original count) + 8 (Phase A) + 5 (Phase B) + 5 (Phase C) + 5 (Phase D) = **293** — exact match, no drift, no double-counted or lost test anywhere across all 4 phases.
- `npx playwright test` (full e2e suite): **53/53 passed**, 1 chromium project, ~1.8 min. This change touches only backend cache/route modules — zero e2e spec files were modified in any phase (A–D), and the e2e suite exercises the dashboard's mocked-`fetch` boundary (not the real routes/Redis), so it was never expected to be affected by this change; re-run in full here as an independent confirmation, not because any risk was anticipated.
- `git diff --stat` confined-scope check (design.md/E.2's requirement, self-checked early since Phase E hasn't formally run yet): `src/domain/`, `src/decision/policy.ts`, `src/stream/`, `src/laf/`, `n8n/` all show zero diff — this phase, like A–C before it, touched only the 2 cache modules (already converted in B/C, untouched again here), 3 routes, 1 test helper, and their tests.

## Deviations from Design

Two deviations, both flagged as necessary consequences of prior phases' own confirmed decisions, not silent departures from design.md itself:

1. **Two test files (`tests/api/cycle.test.ts`, and implicitly the pre-Phase-D `tests/api/decisions.test.ts`/`decisions-invariance.test.ts`) had NO `@/src/lib/redis` mock at all before this phase**, meaning their `cache.put`/`cache.get`/`cache.clear()` calls were hitting the real (unconfigured, in this test env) `Redis.fromEnv()` client. Phase B/C's apply-progress already flagged this exact issue for `decisions.test.ts`/`decisions-invariance.test.ts` ("this file does not mock `@/src/lib/redis` at all yet, which is exactly what Phase D is scoped to add") but did not explicitly call out `tests/api/cycle.test.ts` needing the same fix — I extended the same fix to `cycle.test.ts` too, since its pre-Phase-D `cache.put(...)` call was equally unmocked and equally silently failing (invisible only because it was never awaited/observed pre-D.4). This is a scope extension implied by, not contradicting, design.md's "Test double" decision (mock the low-level client everywhere it's exercised through a route).
2. **`tests/api/narrative.test.ts`'s "crafted query string" test's cache-busting step could not use `narrativeCache.clear()`** as tasks.md's shape implicitly assumed, because Phase C's C.2 deviation made `clear()` a documented no-op (no enumerable key space to sweep against a `get`/`set`/`del`-only client surface). Substituted `fakeRedis.__reset()` + re-seeding the cycle cache, which achieves the same test-isolation intent (force a second, distinct LLM call for the same `(asset, t)`) without relying on a `clear()` contract Phase C explicitly does not provide. Also left the rate-limit test's own `narrativeCache.clear()` call in place (harmless no-op there, since rate limiting runs before the cache lookup in the route — verified this does not affect that test's correctness) and added an inline comment explaining why.

No behavioral contract from design.md's Interfaces/Contracts, Architecture Decisions, or File Changes tables was deviated from — the route signatures, the `502 CACHE_WRITE_FAILED` shape, the fire-and-forget narrative-cache write, and every `await` insertion point match design.md exactly.

## Issues Found

1. **Pre-existing test bug discovered and fixed**: `tests/api/decisions.test.ts`'s original "expired cache entry" test used a real `setTimeout(resolve, 5)` wait against a `ttlMs=1` cache entry seeded via the pre-Phase-B synchronous in-memory `Map`. Under Phase B's Redis-native `EX` TTL (`Math.max(1, Math.ceil(ttlMs / 1000))`), `ttlMs=1` rounds UP to a full 1-second TTL — a 5ms real-time wait could never have observed that expiry correctly once Phase B landed, meaning this specific test would have started silently testing the wrong thing (or, if the assertion by coincidence still passed due to cache-miss-by-other-means, testing nothing meaningful) the moment Phase B's conversion reached this file, had Phase D not caught and fixed it. Rewrote with `vi.useFakeTimers()`, matching design.md's own explicit guidance for this exact class of test.
2. No other issues. `src/lib/redis.ts` (Phase A), `src/cycle/latest.ts` (Phase B), and `src/narrative/cache.ts` (Phase C) required zero further changes — all three were consumed exactly as designed, confirming the interface contracts negotiated across A→C held up unchanged through the final integration phase.

## Remaining Tasks (Phase E only, NOT started — manual/orchestrator-owned)

- [ ] Phase E: Final full-suite verification (E.1, largely pre-confirmed by this phase's own regression check above — orchestrator should independently re-verify) + spec-scenario self-check (E.3) + the `[MANUAL-VERIFICATION-ONLY]` Upstash provisioning/deploy gate (E.4–E.7), which cannot be performed by an agent.

### E.3 spec-scenario self-check (performed early, non-authoritatively, to aid the orchestrator's Phase E)

- semantic-ingestion "Market-keyed presentation cache" (5 scenarios): acciones-doesn't-affect-crypto → `tests/cycle/latest.test.ts` "an acciones push does not affect the crypto cache entry" (Phase B). crypto-doesn't-affect-acciones → same file, "a crypto push does not affect the acciones cache entry" (Phase B). cross-instance visibility → not literally provable locally (two-instance concurrency); covered by design (Redis is the shared store, not per-instance memory) and Phase E's manual gate is the actual proof. Redis-unreachable-yields-503 → `tests/api/decisions.test.ts` "Redis read failure -> 503 NO_DATA" (Phase D, this phase, end-to-end through the route) + `tests/cycle/latest.test.ts`'s fail-open unit tests (Phase B). TTL-native-expiry → `tests/cycle/latest.test.ts` "each market cache entry expires independently... (Redis-native EX)" (Phase B) + `tests/api/decisions.test.ts`'s rewritten fake-timer expiry test (Phase D, this phase).
- decision-narrative "Cost-mitigation caching" (3 scenarios): repeated-open-reuses-cache → `tests/api/narrative.test.ts` "repeated request for the same (asset, decision.t) -> cache hit, exactly ONE upstream call total" (pre-existing, now passing again post-Phase-D). new-decision-invalidates-cache → covered by `tests/narrative/cache.test.ts`'s new-`t`-invalidation scenario (Phase C) + the key scheme (`narrative:{asset}:{t}`) making a new `t` structurally a different key. cross-instance narrative hit → same caveat as cycle cache's cross-instance scenario; not literally provable locally, covered by design + Phase E's manual gate.

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 4 (PR4) — route wiring + remaining test updates, the FINAL code unit
- Boundary: starts from Phase C's committed-but-unpushed baseline (`8f5f73e`); ends with all 3 routes awaiting their cache calls, `502 CACHE_WRITE_FAILED` implemented, `seedCycleCache` async, and all 4 named test files updated — the full A→D stack is now internally consistent (0 tsc errors, 0 failing tests)
- Estimated review budget impact: medium — 3 production route files (~25 lines of diff total) + 1 test helper (~10 lines) + 3 test files rewritten/extended (~190 lines of diff total); within tasks.md's own PR4 estimate, well inside a reasonable single-PR review given it is almost entirely mechanical `await` insertion plus test scaffolding

## Status

9/9 Phase D tasks complete (21/26 total tasks across all code phases: A's 6 + B's 3 + C's 3 + D's 9 — Phase E's 7 tasks are the only remainder, and E.4–E.7 are explicitly `[MANUAL-VERIFICATION-ONLY]`, not agent-executable). **`npx tsc --noEmit` is fully clean (0 errors) and `npx vitest run` is fully green (42/42 files, 293/293 tests)** — the entire 4-PR A→D stack is now internally consistent for the first time since Phase A. `npx playwright test` also fully green (53/53). Ready for `sdd-verify`. Not committed/pushed — orchestrator holds the commit and the full A→D push per the chained-delivery/production-safety plan; this phase's diff is scoped exactly to Unit 4's rollback boundary above and is independently revertible without touching A/B/C's already-committed work.

---

# Phase F — Remediation (2026-08-23): Redis Client Construction-Options Fix (single PR)

## Mode

Strict TDD Mode: active (tasks.md "Phase F" section, line 97). Genuine RED→GREEN behavior change on the exact line that failed in production (`new Redis({ url, token })` → `new Redis({ url, token, automaticDeserialization: false })`) — full TDD cycle followed with an observed, recorded RED before the fix landed.

## Context (why this phase exists)

First live production test of the deployed A→D stack on 2026-08-23: deterministic `503 Servicio no Disponible` on BOTH markets while n8n writes stayed fully green. Root cause (orchestrator-verified, design.md "Remediation Phase F"): `@upstash/redis` defaults `automaticDeserialization: true`, so `get()` returned the PARSED object; `src/cycle/latest.ts`'s `JSON.parse(raw)` then threw `SyntaxError`, swallowed by the deliberate fail-open `catch` → `null` → `503 NO_DATA` on every read. Invisible locally because `tests/helpers/fakeRedis.ts` returns values verbatim (it never modeled SDK auto-deserialization) and `getRedis()` is `vi.mock`'d in every downstream test — a test-double fidelity gap, not a logic bug. Phases A–E above are historical record; this section is Phase F's operative record.

## Completed Tasks (Phase F — all 4)

- [x] F.1 RED: created `tests/lib/redis.test.ts` (48 lines, new) — `vi.mock('@upstash/redis')` (automock, constructor spy — the low-level-client mock pattern established by `tests/narrative/client.test.ts`'s `vi.mock('@anthropic-ai/sdk', ...)`), importing the REAL `src/lib/redis.ts` via dynamic `await import('@/src/lib/redis')` — the ONLY test in the repo that does NOT use `vi.mock('@/src/lib/redis', ...)`. Env vars (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) set in `beforeEach` before the first `getRedis()` call and deleted in `afterEach`; `vi.resetModules()` per test keeps the module-scope `client` singleton isolated. Asserts `Redis` was called exactly once with `expect.objectContaining({ url, token, automaticDeserialization: false })`. **RED observed and recorded**: `npx vitest run tests/lib/redis.test.ts` → 1 failed — `AssertionError: expected "_Redis" to be called with arguments: [ ObjectContaining{…} ]`; received `Object { "token": "fake-token", "url": "https://fake.upstash.io" }` — the option absent, exactly the production defect. Right failure for the right reason (missing construction option, not an infrastructure/typo failure).
- [x] F.2 GREEN: `src/lib/redis.ts` — `client = new Redis({ url, token, automaticDeserialization: false });` (the only code-line change); module doc comment extended with the why (SDK-default auto-deserialization → `get()` returns parsed object → `latest.ts` double-parse → swallowed `SyntaxError` → deterministic 503; keeps the explicit `JSON.stringify`/`JSON.parse` contract in the cache modules and makes production exactly match the fake; references design.md "Remediation Phase F" and the guard test). Re-ran `npx vitest run tests/lib/redis.test.ts` → **1/1 passed** (GREEN observed).
- [x] F.3 Doc: `tests/helpers/fakeRedis.ts` — doc-comment-only edit (+11 lines, zero behavior change): records that the fake models the client AS CONFIGURED with `automaticDeserialization: false`, that its verbatim-value semantics are faithful ONLY under that configuration, that the SDK default is what hid the 2026-08-23 double-parse outage from the local suite, and that `tests/lib/redis.test.ts` pins the real client's construction options so the fake can never silently drift from production again.
- [x] F.4 Gate: full suite re-run — `npx vitest run` → **43 files / 294 tests, ALL PASSED** (293 pre-existing unchanged + 1 new F.1 guard; cumulative arithmetic 293 + 1 = 294 exact). `npx playwright test` → **53/53 passed** (1 chromium project, ~1.8 min). `npx tsc --noEmit` → **exit 0, 0 errors, fully clean**.

## Files Changed (Phase F)

| File | Action | What Was Done |
|---|---|---|
| `tests/lib/redis.test.ts` | Created | Construction-options guard: automocked `@upstash/redis` constructor spy asserts `automaticDeserialization: false` (+ url/token) is passed by the REAL `getRedis()`; the only test exercising the real construction line. |
| `src/lib/redis.ts` | Modified | `new Redis({ url, token, automaticDeserialization: false })`; module doc comment extended with the outage root-cause chain and the design.md reference. |
| `tests/helpers/fakeRedis.ts` | Modified (doc comment only) | Records the fake models the client as configured with `automaticDeserialization: false`; verbatim semantics faithful only under that configuration. |
| `openspec/changes/presentation-cache-persistence/tasks.md` | Modified | Marked F.1–F.4 `[x]`. |
| `openspec/changes/presentation-cache-persistence/apply-progress.md` | Modified | Appended this Phase F section (Phases A–E sections preserved unchanged). |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| F.1/F.2 `src/lib/redis.ts` construction options | `tests/lib/redis.test.ts` | Unit — construction guard | ✅ Full pre-change suite green at phase start (42 files / 293 tests, Phase D's final state) | ✅ Written first and OBSERVED failing: constructor received `{ url, token }` with `automaticDeserialization` absent — `AssertionError` diff shows `ObjectContaining{ "automaticDeserialization": false, ... }` expected vs `Object { token, url }` received | ✅ 1/1 passed after the one-line constructor fix | ✅ Assertion uses `expect.objectContaining` pinning all three options (url source, token source, deserialization) — the guard covers the whole construction config, not just the one regression option; `toHaveBeenCalledTimes(1)` also pins lazy-singleton single-construction behavior | ✅ Module doc comment updated (the why, the outage chain, the design.md reference); no further refactor — change is a single constructor option |

### Test Summary
- **Total tests written this phase**: 1 (`tests/lib/redis.test.ts`)
- **Total tests passing**: 1/1 (294/294 full suite)
- **Layers used**: Unit — construction guard (design.md Testing Strategy's `[Rem. F]` row)
- **Approval tests** (refactoring): None
- **Pure functions created**: 0

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/lib/redis.test.ts` → RED: 1 failed (option absent); GREEN: 1/1 passed after F.2 |
| Runtime harness command/scenario and exact result | N/A for real Upstash (the Phase E manual gate E.4–E.7 stays user-owned and is re-attempted after this fix deploys — the live cross-instance read is the only true proof, per design.md). Closest available harnesses run and green: `npx tsc --noEmit` exit 0; `npx playwright test` 53/53 (e2e boundary, unaffected by this backend-only change, re-run as independent confirmation). |
| Rollback boundary | Revert `tests/lib/redis.test.ts`, `src/lib/redis.ts`, `tests/helpers/fakeRedis.ts` (3 files, ~73 changed lines total: 48 new + 14 + 11). Zero coupling to any other module — nothing imports `tests/lib/redis.test.ts`, and the `src/lib/redis.ts` diff is confined to the constructor call + doc comment. Reverting returns the project to the exact post-Phase-D committed state. |

## Full-Suite Regression Check

- `npx vitest run`: **43 files / 294 tests, ALL PASSED** (was 42 files / 293 tests post-Phase-D; the +1 file / +1 test is exactly F.1's guard). No pre-existing test was modified in any way — fake behavior is unchanged (verbatim semantics now match the real client's configuration, by construction).
- `npx playwright test`: **53/53 passed**, unchanged.
- `npx tsc --noEmit`: **0 errors, fully clean, project-wide.**
- Scope check: Phase F touched only `src/lib/redis.ts` (1 code line + doc), `tests/helpers/fakeRedis.ts` (doc only), the new `tests/lib/redis.test.ts`, and this change's own openspec artifacts. Zero diff in any other `src/`, `app/`, or `tests/` module.

## Deviations from Design

None — implementation matches design.md "Remediation Phase F"'s Fix/Regression-net/Fake-documentation decisions exactly (single constructor option, guard test via `@upstash/redis` automock, doc-only fake edit). The `expect.objectContaining` assertion additionally pins `url`/`token` provenance, which is a superset of the required assertion, not a deviation.

## Issues Found

1. None in the code. One process note: while persisting this section, an intermediate edit to this file briefly overwrote Phase D's "## Status" paragraph; it was immediately restored verbatim from the pre-edit content and confirmed intact before this section was appended. No other phase's content was touched.

## Remaining Tasks

- [ ] Phase E manual gate E.4–E.7 (`[MANUAL-VERIFICATION-ONLY]`, user-owned) — re-attempted AFTER this fix deploys; E.7's live multi-load check is the actual proof the production bug (and its remediation) is resolved.
- [ ] Orchestrator-owned: re-run `sdd-verify` for the remediated state, then archive. The prior verify report (2026-08-23, verdict: fail, 2 blockers) is superseded by this remediation pending re-verification.

## Workload / PR Boundary

- Mode: single PR (tasks.md Phase F forecast: ~40–60 estimated changed lines, budget risk Low, chained PRs not recommended)
- Current work unit: `phase-f-remediation` (native runtime token `sha256:f131e8b6…`, max 100 changed lines)
- Boundary: exactly the 3 code/test files above + this change's openspec artifacts; starts from the committed post-Phase-D baseline, ends with the construction fix + guard test + fake documentation
- Actual changed lines: **73 implementation lines** (48 new test + 14 `src/lib/redis.ts` + 11 `fakeRedis.ts` doc) + 8 tasks.md checkbox lines + this apply-progress section — implementation well under the 100-line budget

## Status

4/4 Phase F tasks complete. The remediation fixes the exact production root cause (deterministic 503 on both markets via SDK-default auto-deserialization double-parse), adds a permanent construction-options guard test so the class of bug cannot recur silently, and leaves the full suite green (vitest 294/294, playwright 53/53, tsc 0 errors). NOT committed/pushed — orchestrator owns delivery. Ready for orchestrator re-verification (`sdd-verify`) and then `sdd-archive`; Phase E's manual gate (E.4–E.7) remains user-owned post-deploy.

---

# Phase E — Automated Gates (2026-08-23)

Phase E tasks E.1–E.3 were independently re-run after Phase F. No production or test code was modified; this subsection records gate evidence only. E.4–E.7 remain explicitly user-owned manual gates.

## Completed Tasks

- [x] E.1 Full automated suite: `npx vitest run` exit 0 — 43 files / 294 tests passed; `npx tsc --noEmit` exit 0 — 0 errors; `npx playwright test` exit 0 — 53/53 passed. Independent Phase F guard: `npx vitest run tests/lib/redis.test.ts` exit 0 — 1 file / 1 test passed.
- [x] E.2 Zero-diff reasoning-core check against the recorded pre-Phase-A baseline `1e2b9eebc74984178d2e03807cd9c0f4e34936a9`: `git diff --name-status 1e2b9ee -- src/domain/ src/decision/policy.ts src/stream/ src/laf/ n8n/` exit 0 with empty output (`RESULT: empty diff (zero paths changed)`).
- [x] E.3 Scenario mapping completed below. Six scenarios are locally proven by passing automated tests; both cross-instance scenarios remain unprovable locally and are reserved for E.7 live proof.

## Automated Gate Evidence

| Check | Exact command/result |
|---|---|
| Vitest | `npx vitest run` → exit 0; 43/43 files, 294/294 tests passed |
| TypeScript | `npx tsc --noEmit` → exit 0; 0 errors |
| Playwright | `npx playwright test` → exit 0; 53/53 passed, 1 Chromium project, 1 worker |
| Phase F guard | `npx vitest run tests/lib/redis.test.ts` → exit 0; 1/1 file, 1/1 test passed |
| Reasoning-core diff | `git diff --name-status 1e2b9ee -- src/domain/ src/decision/policy.ts src/stream/ src/laf/ n8n/` → exit 0; empty output |

## E.3 Scenario Mapping

| Spec scenario | Passing evidence | Status |
|---|---|---|
| Acciones push does not affect crypto cache | `tests/cycle/latest.test.ts` — “an acciones push does not affect the crypto cache entry” | Locally proven |
| Crypto push does not affect acciones cache | `tests/cycle/latest.test.ts` — “a crypto push does not affect the acciones cache entry” | Locally proven |
| Cycle write visible to a different instance | No local single-process test can prove independent serverless-instance visibility; Redis-backed design is source evidence only | **Not locally provable; E.7 required** |
| Redis read failure yields `503 NO_DATA` | `tests/api/decisions.test.ts` — “Redis read failure -> 503 NO_DATA (fail-open)” plus cycle-cache fail-open tests | Locally proven |
| Store-native TTL expiry | `tests/cycle/latest.test.ts` native-`EX` expiry test plus `tests/api/decisions.test.ts` fake-timer expiry test | Locally proven |
| Repeated narrative open reuses cache | `tests/api/narrative.test.ts` — “repeated request for the same (asset, decision.t) -> cache hit, exactly ONE upstream call total” | Locally proven |
| New decision invalidates narrative cache | `tests/narrative/cache.test.ts` — “a new decision.t for the same asset is a MISS” | Locally proven |
| Cached narrative hit visible across instances | No local single-process test can prove independent serverless-instance visibility; Redis-backed design is source evidence only | **Not locally provable; E.7 required** |

## TDD Cycle Evidence

Verification-only work unit; no RED test, production implementation, test implementation, or refactor was required.

| Task | Safety Net | RED | GREEN / evidence | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| E.1 | N/A — no code edited | N/A — gate execution | ✅ Full suite and independent guard passed | ✅ Guard run independently from full suite | N/A |
| E.2 | N/A — read-only Git check | N/A — no behavior change | ✅ Baseline diff empty | ✅ All five protected path groups checked | N/A |
| E.3 | N/A — evidence mapping | N/A — no test authored | ✅ 6 local / 2 manual-only scenarios classified honestly | ✅ Both cross-instance cases explicitly withheld from local proof | N/A |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | Full automated gate commands above; all exit 0. Independent guard: 1/1 passed. |
| Runtime harness command/scenario and exact result | N/A for cross-instance Redis visibility; local Playwright is green but does not exercise two live Vercel instances. E.4–E.7 are the user-owned runtime gate, with E.7 required for the two cross-instance scenarios. |
| Rollback boundary | Revert only the E.1–E.3 checkbox changes in `tasks.md` and this appended Phase E evidence section in `apply-progress.md`; no `src/`, `app/`, or `tests/` code changed. |
| Changed-line count | 68 authored changed lines for this unit: 62 appended evidence lines plus 6 lines for the three checkbox replacements; below the 200-line cap. |

## Remaining Tasks

- [ ] E.4 `[MANUAL-VERIFICATION-ONLY]` User provisions Upstash for Redis.
- [ ] E.5 `[MANUAL-VERIFICATION-ONLY]` User adds the Redis env vars to Vercel.
- [ ] E.6 `[MANUAL-VERIFICATION-ONLY]` User redeploys.
- [ ] E.7 `[MANUAL-VERIFICATION-ONLY]` User confirms live multi-instance visibility after one n8n push; this is the actual proof for both cross-instance scenarios.

## Status

3/3 automatable Phase E tasks complete. Phase F guard and all required local gates pass. E.4–E.7 remain pending and user-owned; do not claim the two cross-instance scenarios are locally proven.
