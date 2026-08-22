# Tasks: NO_RECOMMENDATION visibility + Spanish UI

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~615-650 total (11 modified files, 4 new files, 5 test files touched) |
| 400-line budget risk | High (total); Medium-High for Phase 1 alone (~400-420), Low-Medium for Phases 2-4 |
| Chained PRs recommended | Yes |
| Suggested split | PR1 selector+coercion-bug fixes -> PR2 i18n utility+Spanish component text -> PR3 narrative prompt constraint -> PR4 remaining Spanish prose+e2e sweep |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (recommended — see Delivery Route Recommendation) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | `selectByDirection` widen + 2 coercion-bug fixes (`DecisionCard`, `ArgumentGraph`/`ThesisScores`) + `OverviewClient`/`EmptyState` rescoping | PR1 | `npx vitest run tests/dashboard/lib/select.test.ts tests/dashboard/components` | `npx playwright test tests/e2e/dashboard.spec.ts` | Revert `lib/select.ts`, `DecisionCard.tsx`, `RecommendationBadge.tsx`, `EmptyState.tsx`, `OverviewClient.tsx`, `ArgumentGraph.tsx`, `ThesisScores.tsx`, `select.test.ts`, new component tests, `dashboard.spec.ts` diff; restores prior hide-invariant |
| 2 | `lib/i18n.ts` + Spanish text in `RecommendationBadge`/`EmptyState`/`DirectionFilter` + 4th tab | PR2 | `npx vitest run tests/dashboard/lib/i18n.test.ts` | `npx playwright test tests/e2e/market-nav.spec.ts -g "recomendaci"` | Revert `lib/i18n.ts`, `DirectionFilter.tsx`, and the 2 swapped-literal lines in `RecommendationBadge.tsx`/`EmptyState.tsx`; PR1's structural fixes stay intact (English labels) |
| 3 | `src/narrative/prompt.ts` anti-English-token rule + golden test, atomic | PR3 | `npx vitest run tests/narrative/prompt.test.ts` | N/A (no LLM call needed — golden-string + `toContain` assertions only) | Revert `prompt.ts` bullet + `GOLDEN_SYSTEM_PROMPT` together; no partial state possible |
| 4 | `DashboardHeader`/`inicio/page.tsx`/`PipelineDiagram` Spanish prose + remaining e2e English-text sweep | PR4 | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` | `npx playwright test` (full) | Revert the 3 prose files + `market-nav.spec.ts`/`dashboard.spec.ts` text-assertion diff; no logic touched |

## Phase 1: Selector Widening + Coercion-Bug Fixes (PR1)

- [x] 1.1 RED `tests/dashboard/lib/select.test.ts`: rewrite for `selectByDirection` — 4-way filter (`ALL|BUY|SELL|NO_RECOMMENDATION`), `NO_RECOMMENDATION` decisions now included in `ALL` and selectable directly, no hide behavior.
- [x] 1.2 GREEN `app/(dashboard)/lib/select.ts`: rename `selectActionable`->`selectByDirection`, widen `Direction` to 4 states, drop the pre-filter (per design.md's exact 2-line body).
- [x] 1.3 RED `tests/dashboard/components/DecisionCard.test.ts` (new): `renderToString(DecisionCard(...))` for a `NO_RECOMMENDATION` fixture asserts `data-recommendation="NO_RECOMMENDATION"`, not `"SELL"`; existing BUY/SELL fixtures still resolve correctly (regression).
- [x] 1.4 GREEN `app/(dashboard)/components/RecommendationBadge.tsx`: widen prop to full `Recommendation`, add 3rd `inactive` branch (`border-inactive/40 bg-inactive/10 text-inactive`); label stays the raw literal for now — Phase 2 swaps to `translateRecommendation`.
- [x] 1.5 GREEN `app/(dashboard)/components/DecisionCard.tsx`: delete the `recommendation === 'BUY' ? 'BUY' : 'SELL'` coercion line; pass `decision.recommendation` straight to `RecommendationBadge`.
- [x] 1.6 RED `tests/dashboard/components/ArgumentGraph.test.ts` (new, also covers `ThesisScores`): assert winningThesis follows `sigmaPlus >= sigmaMinus` — existing BUY/SELL fixtures agree with old ternary behavior; new `NO_RECOMMENDATION` fixture with `sigmaPlus > sigmaMinus` highlights bullish, not bearish-by-default.
- [x] 1.7 GREEN `app/(dashboard)/components/ArgumentGraph.tsx` and `ThesisScores.tsx`: replace `recommendation === 'BUY' ? 'bullish' : 'bearish'` with `sigmaPlus >= sigmaMinus ? 'bullish' : 'bearish'` (using each file's existing `computeScores` result).
- [x] 1.8 RED `tests/e2e/dashboard.spec.ts`: rewrite `'renders a card only for BUY/SELL assets, none for NO_RECOMMENDATION'` -> all 3 assets render (BTC/ETH/SOL), SOL card asserts `data-recommendation="NO_RECOMMENDATION"` present and visible, not `toHaveCount(0)`.
- [x] 1.9 RED same file: rewrite `'Tier 1 — empty states'` block — `ALL_NO_RECOMMENDATION_REPORT` now renders 1 muted card per asset (not `empty-state`); add a genuinely-empty-report (`decisions: []`) fixture/scenario asserting `empty-state`/`no-active` fires only then.
- [x] 1.10 GREEN `app/(dashboard)/components/OverviewClient.tsx`: drop the `allActionable` pre-filter call, use `selectByDirection`; `EmptyState variant="no-active"` fires only when `report.decisions.length === 0`; `variant="filtered"` fires when `visible.length === 0` with a non-empty report, passing `direction` directly (typed `Exclude<Direction,'ALL'>`, safe per design.md's ALL-can-never-hit-filtered proof).
- [x] 1.11 GREEN `app/(dashboard)/components/EmptyState.tsx`: widen `direction?: Exclude<Direction, 'ALL'>` (import `Direction` from `lib/select`); copy still interpolates the raw literal for now — Phase 2 swaps to `translateDirection`.
- [x] 1.12 Verify GREEN: `npx vitest run tests/dashboard/lib/select.test.ts tests/dashboard/components` + `npx playwright test tests/e2e/dashboard.spec.ts` + `npx tsc --noEmit`.

## Phase 2: i18n Utility + Spanish Component Text (PR2)

- [x] 2.1 RED `tests/dashboard/lib/i18n.test.ts` (new, thin): one assertion per `Record` key — `translateRecommendation('BUY'|'SELL'|'NO_RECOMMENDATION')`, `translateDirection('ALL'|...)`.
- [x] 2.2 GREEN `app/(dashboard)/lib/i18n.ts` (new): `RECOMMENDATION_ES`/`DIRECTION_ES` `Record` constants + `translateRecommendation`/`translateDirection`, per design.md's exact interfaces (Compra/Venta/Sin recomendación/Todos).
- [x] 2.3 GREEN `app/(dashboard)/components/RecommendationBadge.tsx`: swap the raw-literal label to `translateRecommendation(recommendation)` (all 3 branches, not just `inactive`).
- [x] 2.4 GREEN `app/(dashboard)/components/EmptyState.tsx`: swap `direction` interpolation to `translateDirection(direction)` in both headline and status copy.
- [x] 2.5 GREEN `app/(dashboard)/components/DirectionFilter.tsx`: `OPTIONS` becomes `['ALL','BUY','SELL','NO_RECOMMENDATION']`; button label `translateDirection(option)`; `data-testid` keeps the raw English enum value (`direction-filter-NO_RECOMMENDATION`) as the stable identifier.
- [x] 2.6 RED+GREEN `tests/e2e/dashboard.spec.ts`: add a 4th-tab scenario — clicking `direction-filter-NO_RECOMMENDATION` isolates only the muted card; update the `'ALL'` comment (now 3 assets, not 2).
- [x] 2.7 RED+GREEN `tests/e2e/market-nav.spec.ts`: add `'Sin recomendación filter isolates muted cards'` scenario per `specs/market-navigation/spec.md`, asserting `aria-pressed` on the 4th control.
- [x] 2.8 Verify GREEN: `npx vitest run tests/dashboard/lib/i18n.test.ts` + `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts -g "recomendaci"` + `npx tsc --noEmit`.

## Phase 3: Narrative Prompt Anti-English-Token Rule (PR3)

- [x] 3.1 RED `tests/narrative/prompt.test.ts`: add `expect(NARRATIVE_SYSTEM_PROMPT).toContain('en inglés')` and update `GOLDEN_SYSTEM_PROMPT` with the new bullet (confirm the equality assertion fails against unmodified `prompt.ts`).
- [x] 3.2 GREEN `src/narrative/prompt.ts`: append `- Nunca uses las palabras en inglés "BUY", "SELL" ni "NO_RECOMMENDATION" en tu texto: usa siempre "comprar"/"vender", o "sin recomendación" cuando corresponda.` to `Reglas estrictas:`, verbatim, same dash-prefix style as the other 6 rules. Land 3.1+3.2 in the same commit — a split leaves a broken byte-equality window (design.md).
- [x] 3.3 Verify GREEN: `npx vitest run tests/narrative/prompt.test.ts`.

## Phase 4: Remaining Spanish Prose + e2e Text Sweep (PR4)

- [x] 4.1 GREEN `app/(dashboard)/components/DashboardHeader.tsx:26`: replace `"BUY/SELL"` with the **exact pinned copy** from `openspec/specs/market-navigation/spec.md`'s "Determinism disclaimer" — `"Cada tarjeta muestra una recomendación Compra/Venta/Sin recomendación derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA."` (spec.md's slash-separated wording is authoritative here, not design.md's alternate phrasing — spec.md is pinned/byte-for-byte tested).
- [x] 4.2 GREEN `app/dashboard/(with-footer)/inicio/page.tsx`: apply design.md's 3 prose edits (lines ~43, ~55) — "BUY/SELL" -> "Compra, Venta o Sin recomendación" phrasing.
- [x] 4.3 GREEN `app/(dashboard)/components/PipelineDiagram.tsx:56` (`<desc>`): "recomendación BUY/SELL" -> "recomendación de Compra, Venta o Sin recomendación".
- [x] 4.4 GREEN `tests/e2e/market-nav.spec.ts:235,442`: update both disclaimer-copy assertions to the exact pinned string from 4.1.
- [x] 4.5 GREEN `tests/e2e/dashboard.spec.ts`: update remaining literal `'BUY'`/`'SELL'` text-content assertions (lines ~300-301, ~344, ~413-441 test titles/comments) to `'Compra'`/`'Venta'`; keep `data-recommendation` attribute assertions unchanged (still raw English, per design).
- [x] 4.6 Verify GREEN: `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts`.

## Phase 5: Final Verification (after all 4 PRs merged)

- [x] 5.1 Run full suite: `npx vitest run` + `npx tsc --noEmit` + `npx playwright test` — all green, zero regressions across the 4-PR stack.
- [x] 5.2 Confirm `src/domain/types.ts`, `src/decision/policy.ts`, `app/api/*`, `tests/golden/*` have zero diff vs. pre-PR1 baseline (D3 — `git diff <base> --stat` across those paths, empty output).
- [x] 5.3 Self-check spec scenarios: `decision-dashboard` (Card overview, Tier 2 drill-down, Multi-asset display), `market-navigation` (DirectionFilter wiring, Determinism disclaimer), `decision-narrative` (Spanish-language output) each map to a passing test from Phases 1-4.

<!-- sdd-archive reconciliation: 5.1-5.3 were unchecked at apply time (apply-progress.md's Phase 4 batch stopped
before Phase 5, per its own "not yet ready for sdd-verify" note). The independent re-verification pass
(sdd-verify, evidence_revision sha256:0afb91520efbade90331d22970aed177a90fe7d4b0118b127baac5b6be777a09,
2026-08-22 00:58:54) directly confirms all three: "Tasks complete | 32 (Phases 1-5, including 5.1-5.3
previously open, now satisfied; 5.3 gap is closed by a1217c0)", a fresh independent full-suite run
(tsc 0 errors, vitest 239/239, playwright 52/52), a re-run D3 zero-diff self-check across all 5 commits,
and a 17/17 spec-scenario compliance matrix covering every scenario named in 5.3. Checked off here at
archive time per the Task Completion Gate's exceptional-reconciliation allowance, backed by that proof. -->

## Delivery Route Recommendation

**stacked-to-main**, matching this repo's precedent (`market-nav-redesign`, `dashboard-ux`). Phase 2 depends on Phase 1's widened `Direction`/`Recommendation` types; Phase 3 is independent but scoped separately per design.md's atomicity requirement; Phase 4 is copy-only and lowest-risk. GitHub does not auto-retarget stacked PR bases on merge — manually rebase each subsequent branch onto `main` after the prior PR merges, per this repo's known gotcha.

## Implementation Order

Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5. Phase 1 must land first (selector rename is a compile-level dependency for nothing external, but its `EmptyState`/`RecommendationBadge` type widening is a prerequisite for Phase 2's translation swap). Phase 3 has no file overlap with 1/2/4 and could technically land anytime, but follows the requested sequence. Phase 5 runs only after all 4 PRs merge.
