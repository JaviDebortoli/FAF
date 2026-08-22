# Apply Progress: Fix Narrative Panel `market` Param Regression

**Change**: narrative-market-param-regression
**Mode**: Strict TDD
**Status**: 13/13 tasks complete (all 5 phases). Ready for verify.

## Completed Tasks

- [x] 1.1 Widened `stubNarrativeSuccess`'s `page.route` glob to `'**/api/decisions/*/narrative?**'`.
- [x] 1.2 Widened `stubNarrativeError`'s `page.route` glob to the same pattern.
- [x] 1.3 Added new RED test `sends the market query param required by the real narrative route contract` in the `Tier 2 — narrative disclaimer` describe block.
- [x] 1.4 (Deviation, in-scope) Widened the inline `page.route` glob in the `Tier 2 — lazy narrative fetch` test (line ~655) — same bug class, would have silently broken post-fix otherwise.
- [x] 2.1 Confirmed RED for the right reason (see evidence below).
- [x] 3.1 Added `market: Market` prop + import to `NarrativePanel.tsx`.
- [x] 3.2 Wired `market` into the fetch URL and the effect's dependency array.
- [x] 3.3 Threaded `market={decision.market}` from `DrilldownPanel.tsx` into `NarrativePanel`.
- [x] 4.1 Added `'BAD_MARKET'` to `UNAVAILABLE_CODES`.
- [x] 5.1 Focused GREEN run confirmed.
- [x] 5.2 Full `npx vitest run` confirmed green.
- [x] 5.3 Full `npx tsc --noEmit` confirmed clean.
- [x] 5.4 Full `npx playwright test` confirmed green.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `tests/e2e/dashboard.spec.ts` | Modified | Widened 3 `page.route` narrative globs to `'**/.../narrative?**'` (stubNarrativeSuccess, stubNarrativeError, and the inline stub in the lazy-fetch test) to tolerate the `?market=` query string; added one new RED→GREEN regression test asserting the panel reaches `data-state="done"` only when a valid `market` param is sent, mirroring the real route's `BAD_MARKET` contract. |
| `app/(dashboard)/components/NarrativePanel.tsx` | Modified | Added `market: Market` prop (imported from `@/src/domain/types`), appended `?market=${market}` to the fetch URL, added `market` to the fetch effect's dependency array, added `'BAD_MARKET'` to `UNAVAILABLE_CODES`. |
| `app/(dashboard)/components/DrilldownPanel.tsx` | Modified | Passed `market={decision.market}` to `<NarrativePanel>` (zero new fetches — `decision.market` was already available). |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.4, 3.1-3.3, 4.1 | `tests/e2e/dashboard.spec.ts` | E2E (Playwright) | ✅ 18/18 (baseline run pre-edit) | ✅ Written | ✅ Passed | ✅ 5 real regression cases exercised (see below) | ➖ None needed — minimal wiring change, already idiomatic |

**Safety Net (baseline, before any test-file edit)**: `npx playwright test tests/e2e/dashboard.spec.ts` → **18/18 passed** (52.6s). This is the pre-existing green state the proposal describes as a false-positive (globs never actually exercised the `market` contract).

**RED (task 2.1)** — after widening the 3 globs + adding the new test, against UNFIXED production code:

```
npx playwright test tests/e2e/dashboard.spec.ts
  5 failed
    Tier 2 — lazy narrative fetch › fires no narrative request before the drill-down opens, one after
    Tier 2 — narrative disclaimer › shows the AI disclaimer alongside the rendered narrative text
    Tier 2 — narrative disclaimer › sends the market query param required by the real narrative route contract   <- new test
    Tier 2 — graceful degradation › 503 NARRATIVE_DISABLED still renders graph + scores; narrative shows unavailable
    Tier 2 — graceful degradation › NO_RECOMMENDATION card opens its drill-down; graph + scores render, narrative shows unavailable
  14 passed (1.5m)
```

All 5 failures are the SAME root cause, confirming RED for the right reason (not a selector/timeout/unrelated error): every failing assertion shows `narrative-panel` stuck at `data-state="failed"` (transitioning `loading -> failed`), because the widened glob no longer intercepts the pre-fix request (which carries no `?` at all), so it falls through to the REAL Next.js dev-server route, which real-400s with `BAD_MARKET` (route.ts:189-192) — exactly the production outage described in the proposal. This also independently confirms the proposal's flagged risk ("widened e2e globs surface other currently-masked narrative assertions") — 4 previously-passing tests were silently relying on the same masking bug, not just the newly authored test.

**GREEN (task 5.1)** — after applying the Phase 3/4 wiring fix, focused run:

```
npx playwright test tests/e2e/dashboard.spec.ts -g "market"
  ok 1 Tier 2 — narrative disclaimer › sends the market query param required by the real narrative route contract (2.8s)
  1 passed (17.4s)
```

**GREEN (full file, task 5.4 partial)**:

```
npx playwright test tests/e2e/dashboard.spec.ts
  19 passed (53.2s)
```

All 5 previously-RED tests are GREEN again, plus the new test — 19/19 (was 18/18 baseline + 1 new test).

**TRIANGULATE**: the fix is exercised across 5 independent real scenarios (not just the single authored test): the lazy-fetch counter test, the disclaimer-success test, the new BAD_MARKET-contract test, and both graceful-degradation error-code tests (503 NARRATIVE_DISABLED, and indirectly the NO_RECOMMENDATION unavailable test) — covering both the success path (200, market echoed) and the failure/degradation path (missing-market 400 exposed the bug; other real error codes like NARRATIVE_DISABLED, UPSTREAM_ERROR continue to route correctly once `market` is sent). This satisfies the "happy path + edge case" minimum without needing additional hand-written cases.

**REFACTOR**: none needed — the wiring change is a 3-line prop/URL/deps addition matching the existing file's exact style and doc-comment conventions (e.g. `DrilldownPanel.tsx` already imports `type { Decision }` the same way `NarrativePanel.tsx` now imports `type { Market }`).

### Test Summary
- **Total tests written**: 1 new e2e test (plus 3 glob-widening edits that reactivated real coverage in 4 pre-existing tests)
- **Total tests passing**: 53/53 e2e (full `npx playwright test`), 270/270 unit (full `npx vitest run`)
- **Layers used**: E2E (1 new + 4 reactivated), Unit (0 new — none needed, `route.ts`/`narrative.test.ts` untouched per proposal)
- **Approval tests** (refactoring): None — no refactoring tasks, only additive wiring
- **Pure functions created**: 0 (React prop-threading only, matches design precedent — no `narrativeUrlFor()` helper extracted, per proposal's explicit out-of-scope decision)

## Full Verification (post-GREEN, whole repo)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Clean — zero output, zero errors |
| `npx vitest run` | **270/270 passed** (41 test files), including `tests/api/narrative.test.ts` (20/20, untouched) |
| `npx playwright test` (full suite, both spec files) | **53/53 passed** (1.7m) — `dashboard.spec.ts` 19/19, `market-nav.spec.ts` 34/34 |

## Deviations from Design

One deviation from the literal task list, disclosed per SKILL rules: task 1.4 (widening the inline `page.route` glob at `tests/e2e/dashboard.spec.ts`'s "lazy narrative fetch" test, ~line 655) was not explicitly listed in `tasks.md`'s Phase 1, but was required to keep task 5.4 ("full e2e suite stays green") true — that inline stub predates `stubNarrativeSuccess`/`stubNarrativeError` and has the identical unwidened-glob bug. Left alone, it would have silently stopped intercepting after the Phase 3 fix (the request would fall through to the real dev server). This is explicitly covered by the proposal's own risk mitigation: "Widened e2e globs surface other currently-masked narrative assertions | Low-Med | Treat as in-scope, matching the sibling Phase D precedent." `tests/e2e/market-nav.spec.ts`'s `stubNarrativeError` was deliberately left untouched — it is a defensive safety-net stub never exercised by any test in that file (no drilldown is ever opened there), so it is genuinely out of scope per the proposal ("broader e2e stub audit beyond the two narrative-specific globs").

## Issues Found

None beyond the disclosed deviation above.

## Workload / PR Boundary

- Mode: single PR (workload forecast: Low risk, no chaining needed)
- Current work unit: Unit 1 — "Restore `market` param wiring + closing e2e regression test"
- Boundary: starts at the RED test-file edits, ends at the GREEN wiring fix + hardening; all 3 files modified in this apply batch
- Estimated review budget impact: ~70 changed lines (within the ~40-60 forecast plus the small task-1.4 deviation) — well under the 400-line budget

## Remaining Tasks

None — all 5 phases / 13 tasks complete.
