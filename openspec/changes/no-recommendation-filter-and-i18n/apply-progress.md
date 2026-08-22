# Apply Progress: no-recommendation-filter-and-i18n

**Phase 1 of 5 — logic/behavior only, no Spanish text yet.** Phases 2-5
(`lib/i18n.ts`, Spanish copy, 4th filter tab UI, `src/narrative/prompt.ts`)
are explicitly NOT started. All user-facing text touched in this batch
remains English, per the orchestrator's Phase 1 scope instruction.

## Mode

Strict TDD Mode (project-wide, enabled).

## Completed Tasks (Phase 1 — 12/12)

- [x] 1.1 RED `tests/dashboard/lib/select.test.ts` rewritten for `selectByDirection` (4-way filter).
- [x] 1.2 GREEN `app/(dashboard)/lib/select.ts`: `selectActionable` -> `selectByDirection`, `Direction` widened to `'ALL'|'BUY'|'SELL'|'NO_RECOMMENDATION'`, pre-filter dropped.
- [x] 1.3 RED `tests/dashboard/components/DecisionCard.test.ts` (new) — D2 coercion-bug regression test.
- [x] 1.4 GREEN `RecommendationBadge.tsx` widened to full `Recommendation`, 3rd `inactive` visual branch added (label stays raw English literal — Phase 2 swaps to `translateRecommendation`).
- [x] 1.5 GREEN `DecisionCard.tsx`: coercion line deleted, `decision.recommendation` passed straight through.
- [x] 1.6 RED `tests/dashboard/components/ArgumentGraph.test.ts` (new, covers `ThesisScores` too) — `winningThesis` coercion-bug regression test.
- [x] 1.7 GREEN `ArgumentGraph.tsx` + `ThesisScores.tsx`: `winningThesis` now `sigmaPlus >= sigmaMinus ? 'bullish' : 'bearish'`.
- [x] 1.8 RED->GREEN `tests/e2e/dashboard.spec.ts` "Tier 1 — card grid" rewritten: all 3 assets render, NO_RECOMMENDATION card asserted via `data-recommendation`.
- [x] 1.9 RED->GREEN same file "Tier 1 — empty states" rewritten: all-NO_RECOMMENDATION report renders muted cards (not empty-state); new genuinely-empty-report scenario added for `no-active`.
- [x] 1.10 GREEN `OverviewClient.tsx`: dropped `allActionable` pre-filter, uses `selectByDirection`; `no-active` fires only on `report.decisions.length === 0`; `filtered` fires on `visible.length === 0` with non-empty report.
- [x] 1.11 GREEN `EmptyState.tsx`: `direction?: Exclude<Direction, 'ALL'>` (imported from `lib/select`); copy still interpolates raw literal (Phase 2 swaps to `translateDirection`).
- [x] 1.12 Verify GREEN — all commands green (see Work Unit Evidence below).

## TDD Cycle Evidence

| Task | RED (test written first, confirmed failing for the right reason) | GREEN (implementation makes it pass) | REFACTOR |
|---|---|---|---|
| 1.1/1.2 `selectByDirection` | `select.test.ts` rewritten; ran — 8/8 failed with `selectByDirection is not a function` | Renamed+widened `lib/select.ts`; ran — 8/8 passed | Doc comments updated to reflect D1 reversal; no further extraction needed |
| 1.3/1.4/1.5 `DecisionCard` coercion | New `DecisionCard.test.ts`; ran — 1/3 failed (`data-recommendation="SELL"` observed instead of `"NO_RECOMMENDATION"`, i.e. the real bug reproduced) | Widened `RecommendationBadge`, removed `DecisionCard`'s coercion line; ran — 3/3 passed | None needed — minimal diff |
| 1.6/1.7 `winningThesis` coercion | New `ArgumentGraph.test.ts` (covers `ThesisScores`); ran — 1/3 failed (NO_RECOMMENDATION fixture highlighted bearish instead of bullish, reproducing the bug) | Replaced both ternaries with `sigmaPlus >= sigmaMinus`; ran — 3/3 passed | Doc comments updated in both files |
| 1.8/1.9 e2e card grid + empty states | Rewrote both e2e blocks against Phase-1-incomplete code; confirmed broken via `npx tsc --noEmit` (`OverviewClient.tsx` still importing the removed `selectActionable` — real, not vacuous, RED) | Implemented 1.10/1.11; ran `npx playwright test tests/e2e/dashboard.spec.ts` — 16/16 passed | None needed |
| 1.10/1.11 `OverviewClient`/`EmptyState` rescoping | (covered by 1.8/1.9's e2e RED above) | `tsc --noEmit` clean; e2e green | Inline comment added documenting the `direction as Exclude<Direction,'ALL'>` cast's safety proof |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/dashboard/lib/select.test.ts tests/dashboard/components tests/dashboard/crypto` — 4 files, 15 tests, all passed |
| Full vitest regression sweep | `npx vitest run` — 39 files, 232 tests, all passed (zero regressions outside Phase 1 scope) |
| Typecheck | `npx tsc --noEmit` — 0 errors |
| Runtime harness command/scenario and exact result | `npx playwright test tests/e2e/dashboard.spec.ts` — 16/16 passed; `npx playwright test tests/e2e/market-nav.spec.ts` (regression check, shares `OverviewClient`/`DirectionFilter`) — 33/33 passed |
| Rollback boundary | Revert: `app/(dashboard)/lib/select.ts`, `app/(dashboard)/components/DecisionCard.tsx`, `RecommendationBadge.tsx`, `EmptyState.tsx`, `OverviewClient.tsx`, `ArgumentGraph.tsx`, `ThesisScores.tsx`, `tests/dashboard/lib/select.test.ts`, `tests/dashboard/components/DecisionCard.test.ts` (new), `tests/dashboard/components/ArgumentGraph.test.ts` (new), `tests/e2e/dashboard.spec.ts` diff. Reverting restores the prior hide-invariant and the two coercion bugs. No file outside this list was touched. |

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `app/(dashboard)/lib/select.ts` | Modified | Renamed `selectActionable`->`selectByDirection`; `Direction` widened to 4 states; dropped the `NO_RECOMMENDATION` pre-filter step |
| `app/(dashboard)/components/RecommendationBadge.tsx` | Modified | Prop widened `Extract<Recommendation,'BUY'\|'SELL'>` -> full `Recommendation`; added `inactive` visual branch using `--color-inactive`; label stays raw English (Phase 2 work) |
| `app/(dashboard)/components/DecisionCard.tsx` | Modified | Deleted the `recommendation === 'BUY' ? 'BUY' : 'SELL'` coercion line; passes `decision.recommendation` straight to `RecommendationBadge` |
| `app/(dashboard)/components/ArgumentGraph.tsx` | Modified | `winningThesis` now `sigmaPlus >= sigmaMinus ? 'bullish' : 'bearish'` instead of `recommendation === 'BUY' ? ... : ...` |
| `app/(dashboard)/components/ThesisScores.tsx` | Modified | Same `winningThesis` fix as `ArgumentGraph.tsx`; doc comment corrected |
| `app/(dashboard)/components/EmptyState.tsx` | Modified | `direction` prop widened to `Exclude<Direction,'ALL'>` (imported from `lib/select`); doc comment updated to reflect the rescoped `no-active`/`filtered` semantics |
| `app/(dashboard)/components/OverviewClient.tsx` | Modified | Dropped the `allActionable` pre-filter variable/call; uses `selectByDirection`; `no-active` fires only on a genuinely empty report; `filtered` fires on a non-empty report with zero visible cards, passing `direction` directly (typed cast, safety documented inline) |
| `tests/dashboard/lib/select.test.ts` | Modified (rewrite) | Rewritten for `selectByDirection`'s 4-way semantics, including `NO_RECOMMENDATION` selectability and the dropped pre-filter |
| `tests/dashboard/components/DecisionCard.test.ts` | Created | D2 coercion-bug regression test (`renderToString` + `react-dom/server`, no JSX in the `.test.ts` file, matching this repo's existing convention from `tests/dashboard/crypto/page.test.ts`) |
| `tests/dashboard/components/ArgumentGraph.test.ts` | Created | `winningThesis` coercion-bug regression test, covering both `ArgumentGraph` and `ThesisScores` |
| `tests/e2e/dashboard.spec.ts` | Modified | "Tier 1 — card grid" and "Tier 1 — empty states" blocks rewritten for the new all-visible/muted-card behavior; new `EMPTY_REPORT` fixture added; `SOL_NO_RECOMMENDATION`/`ALL_NO_RECOMMENDATION_REPORT` doc comments corrected |

## Deviations from Design

None — implementation matches design.md exactly, including the exact
`selectByDirection` body, the `RecommendationBadge` variant/class mapping,
and the `EmptyState`/`OverviewClient` rescoping proof.

## Issues Found

None.

## Out of Scope for This Batch (explicitly not touched)

- `app/(dashboard)/lib/i18n.ts` (Phase 2)
- `app/(dashboard)/components/DirectionFilter.tsx` (Phase 2 — 4th tab)
- Spanish text anywhere (`DashboardHeader.tsx`, `inicio/page.tsx`, `PipelineDiagram.tsx`) (Phase 4)
- `src/narrative/prompt.ts` (Phase 3)
- `openspec/specs/decision-dashboard/spec.md`, `openspec/specs/market-navigation/spec.md` (already written by `sdd-spec`; no edits made in this apply batch)

## Remaining Tasks

- [ ] Phase 2: i18n Utility + Spanish Component Text (PR2) — tasks 2.1-2.8
- [ ] Phase 3: Narrative Prompt Anti-English-Token Rule (PR3) — tasks 3.1-3.3
- [ ] Phase 4: Remaining Spanish Prose + e2e Text Sweep (PR4) — tasks 4.1-4.6
- [ ] Phase 5: Final Verification (after all 4 PRs merged) — tasks 5.1-5.3

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 1 / PR1 — `selectByDirection` widen + 2 coercion-bug fixes + `OverviewClient`/`EmptyState` rescoping
- Boundary: starts from the unmodified pre-change codebase, ends with all 12 Phase 1 tasks green (vitest + playwright + tsc)
- Estimated review budget impact: within tasks.md's forecast for Phase 1 alone (Medium-High, ~400-420 lines); orchestrator will independently verify and commit

## Status

12/12 Phase 1 tasks complete. Ready for orchestrator verification (`npx tsc --noEmit`, `npx vitest run`, `npx playwright test`) and commit. Not yet ready for `sdd-verify` on the full change — Phases 2-5 remain.

---

# Phase 2 of 5 — i18n Utility + Spanish Component Text (PR2)

Builds directly on Phase 1 (commit `b25938c` on `main`): `selectByDirection`'s
4-way `Direction` type and `RecommendationBadge`/`EmptyState`'s widened props
are the prerequisite this phase's translation swap consumes. Per design.md's
testing-strategy table, `lib/i18n.ts` itself is the one genuine logic
addition in this phase (RED->GREEN, thin — one assertion per `Record` key).
Everything else in Phase 2 (`RecommendationBadge`/`EmptyState`/
`DirectionFilter` copy swaps, the 4th tab) is categorized GREEN-only — "pure
copy/CSS... no new logic branch" — so no RED test was fabricated for those;
the e2e coverage in tasks 2.6/2.7 was written as verification after the GREEN
implementation, not as a driving RED step.

## Mode

Strict TDD Mode (project-wide, enabled) — followed exactly per design.md's
RED-vs-GREEN-only boundary (see above).

## Completed Tasks (Phase 2 — 8/8)

- [x] 2.1 RED `tests/dashboard/lib/i18n.test.ts` (new) — one assertion per `Record` key.
- [x] 2.2 GREEN `app/(dashboard)/lib/i18n.ts` (new): `RECOMMENDATION_ES`/`DIRECTION_ES` + `translateRecommendation`/`translateDirection`, per design.md's exact interfaces.
- [x] 2.3 GREEN `RecommendationBadge.tsx`: label swapped to `translateRecommendation(recommendation)` (all 3 branches).
- [x] 2.4 GREEN `EmptyState.tsx`: `direction` interpolation swapped to `translateDirection(direction)` in headline + status copy.
- [x] 2.5 GREEN `DirectionFilter.tsx`: `OPTIONS` widened to `['ALL','BUY','SELL','NO_RECOMMENDATION']`; button label `translateDirection(option)`; `data-testid` unchanged (raw English, stable identifier).
- [x] 2.6 `tests/e2e/dashboard.spec.ts`: new 4th-tab scenario (`NO_RECOMMENDATION direction filter isolates only the muted card`); `'ALL'` comment updated to reflect all 3 assets.
- [x] 2.7 `tests/e2e/market-nav.spec.ts`: new `DirectionFilter wiring` describe block, `'Sin recomendación filter isolates muted cards'` scenario, asserting `aria-pressed` on all 4 controls.
- [x] 2.8 Verify GREEN — all commands green (see Work Unit Evidence below).

## TDD Cycle Evidence

| Task | RED (test written first, confirmed failing for the right reason) | GREEN (implementation makes it pass) | REFACTOR |
|---|---|---|---|
| 2.1/2.2 `lib/i18n.ts` | New `i18n.test.ts`; ran — failed with `Cannot find module '@/app/(dashboard)/lib/i18n'` (module-not-found, the real/correct RED reason since the file didn't exist yet) | Created `lib/i18n.ts` with the exact `Record` constants from design.md; ran — 7/7 passed | None needed — matches design.md's exact interface verbatim |
| 2.3-2.7 copy/CSS swaps (`RecommendationBadge`, `EmptyState`, `DirectionFilter`, 4th tab, e2e coverage) | N/A — design.md's testing-strategy table explicitly classifies this whole group `GREEN-only`: "Pure copy/CSS; covered by e2e text assertions... (no new logic branch)". No RED test fabricated per the phase instruction's explicit boundary. | Implemented all 5 component/test edits directly, then ran full `npx vitest run tests/dashboard` (44/44) + `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts` (51/51) to confirm GREEN | None needed — minimal, direct swaps matching design.md's exact interpolation targets |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/dashboard/lib/i18n.test.ts` — 1 file, 7 tests, all passed |
| Full vitest regression sweep | `npx vitest run` — 40 files, 239 tests, all passed (zero regressions outside Phase 2 scope) |
| Typecheck | `npx tsc --noEmit` — 0 errors |
| Runtime harness command/scenario and exact result | `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts` — 51/51 passed (includes the new task-2.6 4th-tab scenario and task-2.7 `DirectionFilter wiring` scenario); `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts -g "recomendaci"` (tasks.md's exact 2.8 command) — 1/1 passed |
| Rollback boundary | Revert: `app/(dashboard)/lib/i18n.ts` (new), `app/(dashboard)/components/RecommendationBadge.tsx`, `EmptyState.tsx`, `DirectionFilter.tsx`, `tests/dashboard/lib/i18n.test.ts` (new), `tests/e2e/dashboard.spec.ts` diff, `tests/e2e/market-nav.spec.ts` diff. Reverting restores Phase 1's English labels/3-tab filter; Phase 1's structural fixes (`selectByDirection`, coercion-bug fixes) stay intact. |

## Files Changed (Phase 2)

| File | Action | What Was Done |
|---|---|---|
| `app/(dashboard)/lib/i18n.ts` | Created | `RECOMMENDATION_ES`/`DIRECTION_ES` `Record` constants + `translateRecommendation`/`translateDirection`, per design.md's exact interfaces |
| `app/(dashboard)/components/RecommendationBadge.tsx` | Modified | Label swapped from the raw `Recommendation` literal to `translateRecommendation(recommendation)` across all 3 branches; doc comment updated |
| `app/(dashboard)/components/EmptyState.tsx` | Modified | `direction` interpolation swapped from the raw literal to `translateDirection(direction)` in both headline and status copy |
| `app/(dashboard)/components/DirectionFilter.tsx` | Modified | `OPTIONS` widened to include `'NO_RECOMMENDATION'` (4th tab); button label now `translateDirection(option)`; `data-testid` kept as the raw English enum value |
| `tests/dashboard/lib/i18n.test.ts` | Created | RED->GREEN: one assertion per `Record` key for both `translateRecommendation` and `translateDirection` |
| `tests/e2e/dashboard.spec.ts` | Modified | New 4th-tab scenario in `Tier 1 — direction filter`; `'ALL'` comment corrected; 2 pre-existing literal `'BUY'`/`'SELL'` `toContainText` assertions updated to `'Compra'`/`'Venta'` (see Deviations below — necessary consequence of task 2.3, not a Phase 4 sweep) |
| `tests/e2e/market-nav.spec.ts` | Modified | New `DirectionFilter wiring` describe block with local `directionFixture`/`DIRECTION_FILTER_REPORT` fixtures and the `'Sin recomendación filter isolates muted cards'` scenario (task 2.7), asserting `aria-pressed` on all 4 controls |

## Deviations from Design

One necessary, minimal deviation from a strict Phase 2/Phase 4 task split:
task 2.3's `RecommendationBadge` label swap (English literal ->
`translateRecommendation`) broke 2 pre-existing `toContainText('BUY'/'SELL')`
assertions in `tests/e2e/dashboard.spec.ts` (within the line range tasks.md's
own 4.5 later itemizes for the full sweep). Since task 2.8 requires a GREEN
`npx playwright test` run and these 2 assertions are a direct, unavoidable
consequence of the Phase 2 change I was assigned (not unrelated Phase 4
scope), I updated exactly those 2 assertion lines to `'Compra'`/`'Venta'`.
Everything else task 4.5 covers — test *titles* still saying "BUY card",
comments, `DashboardHeader.tsx`/`inicio/page.tsx`/`PipelineDiagram.tsx`
prose, `market-nav.spec.ts:235,442` disclaimer copy — was left untouched for
Phase 4, per the orchestrator's explicit scope instruction. No other
deviation — implementation otherwise matches design.md exactly, including
the exact `lib/i18n.ts` body and the RED-vs-GREEN-only testing boundary.

## Issues Found

None.

## Out of Scope for This Batch (explicitly not touched)

- `src/narrative/prompt.ts` (Phase 3)
- `app/(dashboard)/components/DashboardHeader.tsx`, `app/dashboard/(with-footer)/inicio/page.tsx`, `PipelineDiagram.tsx` Spanish prose (Phase 4)
- `tests/e2e/market-nav.spec.ts:235,442` disclaimer-copy pinned string (Phase 4, task 4.4)
- Remaining Phase 4 e2e sweep (test titles/comments beyond the 2 assertion lines necessitated by task 2.3)
- `openspec/specs/decision-dashboard/spec.md`, `openspec/specs/market-navigation/spec.md` (already written by `sdd-spec`; no edits made in this apply batch)

## Remaining Tasks

- [ ] Phase 3: Narrative Prompt Anti-English-Token Rule (PR3) — tasks 3.1-3.3
- [ ] Phase 4: Remaining Spanish Prose + e2e Text Sweep (PR4) — tasks 4.1-4.6
- [ ] Phase 5: Final Verification (after all 4 PRs merged) — tasks 5.1-5.3

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 2 / PR2 — `lib/i18n.ts` + Spanish component text + 4th tab
- Boundary: starts from Phase 1's landed state (commit `b25938c`), ends with all 8 Phase 2 tasks green (vitest + playwright + tsc)
- Estimated review budget impact: within tasks.md's forecast for Phase 2 (Low-Medium); orchestrator will independently verify and commit

## Status (cumulative)

20/28 total tasks complete (Phase 1: 12/12, Phase 2: 8/8). Ready for orchestrator verification (`npx tsc --noEmit`, `npx vitest run`, `npx playwright test`) and commit. Not yet ready for `sdd-verify` on the full change — Phases 3-5 remain.
