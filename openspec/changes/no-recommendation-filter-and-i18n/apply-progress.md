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
