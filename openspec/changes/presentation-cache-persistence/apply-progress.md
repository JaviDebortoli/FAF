# Apply Progress: presentation-cache-persistence

**Phase A of 6** (4 code phases [A domain foundation, B cycle cache, C narrative cache, D route wiring] + Phase E manual verification) — **foundation only, nothing wired into any real call site yet.** Phases B/C/D remain untouched.

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
