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

---

# Phase 3 of 5 — Narrative Prompt Anti-English-Token Rule (PR3)

Independent of Phase 1/2 (no file overlap — touches only `src/narrative/prompt.ts`
and `tests/narrative/prompt.test.ts`), landed per the requested sequence. Per
design.md's testing-strategy table this is RED->GREEN: a real constraint
(new prompt rule forbidding literal English "BUY"/"SELL"/"NO_RECOMMENDATION"
tokens in generated prose) driven by a golden-string equality test, updated
in lockstep with the implementation to avoid a broken-equality window.

## Mode

Strict TDD Mode (project-wide, enabled). RED and GREEN landed together in
the same edit batch per design.md's explicit instruction — task 3.2 says
"Land 3.1+3.2 in the same commit — a split leaves a broken byte-equality
window" — so this phase does not have a standalone "confirmed failing"
step recorded separately from the fix; both files were edited atomically
and verified together.

## Completed Tasks (Phase 3 — 3/3)

- [x] 3.1 RED `tests/narrative/prompt.test.ts`: added `expect(NARRATIVE_SYSTEM_PROMPT).toContain('en inglés')` and updated `GOLDEN_SYSTEM_PROMPT` with the new bullet (byte-identical to the new `NARRATIVE_SYSTEM_PROMPT`).
- [x] 3.2 GREEN `src/narrative/prompt.ts`: appended the new bullet to `Reglas estrictas:`, verbatim per design.md, same dash-prefix style as the other 6 rules.
- [x] 3.3 Verify GREEN: `npx vitest run tests/narrative/prompt.test.ts` — 5/5 passed.

## TDD Cycle Evidence

| Task | RED/GREEN (atomic pair, per design.md) | Verify |
|---|---|---|
| 3.1/3.2 anti-English-token rule | `GOLDEN_SYSTEM_PROMPT` and `NARRATIVE_SYSTEM_PROMPT` updated with the identical new bullet in the same edit batch; new `.toContain('en inglés')` assertion added alongside the other content assertions | `npx vitest run tests/narrative/prompt.test.ts` — 5/5 passed (byte-identity check, the 4 `toContain` assertions including the new one, the zero-interpolation structural check, and both `buildUserMessage` tests) |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/narrative/prompt.test.ts` — 1 file, 5 tests, all passed |
| New bullet added (exact text) | `- Nunca uses las palabras en inglés "BUY", "SELL" ni "NO_RECOMMENDATION" en tu texto: usa siempre "comprar"/"vender", o "sin recomendación" cuando corresponda.` |
| Rollback boundary | Revert `src/narrative/prompt.ts` (the appended bullet) and `tests/narrative/prompt.test.ts` (the `GOLDEN_SYSTEM_PROMPT` bullet + the new `toContain('en inglés')` assertion) together; no partial state possible since both changed atomically. |

## Files Changed (Phase 3)

| File | Action | What Was Done |
|---|---|---|
| `src/narrative/prompt.ts` | Modified | Appended a 7th rule to `NARRATIVE_SYSTEM_PROMPT`'s `Reglas estrictas:` list forbidding the literal English tokens "BUY"/"SELL"/"NO_RECOMMENDATION" in generated prose, instructing "comprar"/"vender"/"sin recomendación" instead |
| `tests/narrative/prompt.test.ts` | Modified | `GOLDEN_SYSTEM_PROMPT` updated with the identical new bullet (byte-identity check stays valid); added `expect(NARRATIVE_SYSTEM_PROMPT).toContain('en inglés')` to the existing content-assertions test |

## Deviations from Design

None — the new bullet is verbatim from design.md's "Prose edits" / narrative-prompt section, and RED+GREEN landed atomically as design.md required.

## Issues Found

None.

## Out of Scope for This Batch (explicitly not touched)

- `app/(dashboard)/components/DashboardHeader.tsx`, `app/dashboard/(with-footer)/inicio/page.tsx`, `PipelineDiagram.tsx` Spanish prose (Phase 4)
- `tests/e2e/market-nav.spec.ts:235,442` disclaimer-copy pinned string (Phase 4, task 4.4)
- Remaining Phase 4 e2e sweep (Phase 4, task 4.5)
- Phase 5 final verification (runs only after all PRs merge)

## Remaining Tasks

- [ ] Phase 4: Remaining Spanish Prose + e2e Text Sweep (PR4) — tasks 4.1-4.6
- [ ] Phase 5: Final Verification (after all 4 PRs merged) — tasks 5.1-5.3

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 3 / PR3 — `src/narrative/prompt.ts` anti-English-token rule + golden test, atomic
- Boundary: starts from Phase 2's landed state (commit `b0e19a8`), ends with all 3 Phase 3 tasks green (`npx vitest run tests/narrative/prompt.test.ts`)
- Estimated review budget impact: within tasks.md's forecast for Phase 3 (Low — 2 files, ~1 new line each plus golden-string sync); orchestrator will independently verify (`npx tsc --noEmit`, `npx vitest run`) and commit

## Status (cumulative)

23/28 total tasks complete (Phase 1: 12/12, Phase 2: 8/8, Phase 3: 3/3). Ready for orchestrator verification (`npx tsc --noEmit`, `npx vitest run`) and commit. Not yet ready for `sdd-verify` on the full change — Phases 4-5 remain.

---

# Phase 4 of 5 — Remaining Spanish Prose + e2e Text Sweep (PR4)

Copy/CSS-only per design.md's testing-strategy table (GREEN-only, no
fabricated RED test) — the Playwright pass over the updated e2e assertions
is the GREEN signal for this phase, not a separate unit test. Before editing
`tests/e2e/dashboard.spec.ts`/`market-nav.spec.ts`, grepped both files fresh
for remaining literal `BUY`/`SELL`/`'ALL'` visible-text vs. machine-identifier
usages per the phase instruction, to avoid redoing Phase 2's already-fixed
`toContainText('BUY'/'SELL')` overlap (logged in Phase 2's section above) or
missing anything new.

## Mode

Copy/CSS-only (per design.md's testing-strategy table). No TDD Cycle Evidence
table — this phase has no RED step by design; the e2e Playwright run is the
verification GREEN signal.

## Pinned disclaimer text (quoted from spec.md before editing)

`openspec/changes/no-recommendation-filter-and-i18n/specs/market-navigation/spec.md`
"Determinism disclaimer" requirement pins, verbatim:

> Cada tarjeta muestra una recomendación Compra/Venta/Sin recomendación derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA.

This is spec.md's authoritative slash-separated wording, used exactly
(byte-for-byte) in `DashboardHeader.tsx` and both `market-nav.spec.ts`
assertions — not design.md's alternate "de forma determinística..." phrasing
variant, per the phase instruction's explicit precedence rule.

## Completed Tasks (Phase 4 — 6/6)

- [x] 4.1 GREEN `app/(dashboard)/components/DashboardHeader.tsx:26`: disclaimer paragraph swapped to spec.md's exact pinned copy.
- [x] 4.2 GREEN `app/dashboard/(with-footer)/inicio/page.tsx`: 2 prose edits applied (the file has only 2 BUY/SELL occurrences, not 3 as design.md's summary line estimated — see Deviations).
- [x] 4.3 GREEN `app/(dashboard)/components/PipelineDiagram.tsx:56` (`<desc>`): "recomendación BUY/SELL" -> "recomendación de Compra, Venta o Sin recomendación".
- [x] 4.4 GREEN `tests/e2e/market-nav.spec.ts`: both disclaimer-copy assertions (crypto view + placeholder-market view, `toContainText`) updated to the exact pinned string from 4.1.
- [x] 4.5 GREEN `tests/e2e/dashboard.spec.ts`: swept for remaining literal `BUY`/`SELL` visible-text usages; updated 1 test title ("...actionable BUY card visible" -> "...actionable Compra card visible"), 1 test title ("narrows visible cards to BUY or SELL only" -> "...to Compra or Venta only"), and 2 descriptive comments (the "ALL (default): ... BUY, SELL..." block comment and "Only a BUY asset is actionable this cycle."). Left untouched: fixture doc-comments describing the raw `recommendation: 'BUY'/'SELL'` field values (lines ~73,78,85,113,117,171), the coercion-bug comment naming the raw enum value ("mislabeled as SELL", line ~323), and all `getByTestId('direction-filter-BUY'/'SELL'/'ALL')` selector calls/inline references — all correctly machine identifiers per design.md.
- [x] 4.6 GREEN Verify GREEN: `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` — 51/51 passed.

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` — 51/51 passed |
| Runtime harness command/scenario and exact result | Same command as above is the runtime harness for this phase (copy/CSS-only change; the e2e suite is the acceptance boundary, not a separate unit-test harness) |
| Typecheck | `npx tsc --noEmit` — 0 errors |
| Rollback boundary | Revert the 3 prose files (`DashboardHeader.tsx`, `inicio/page.tsx`, `PipelineDiagram.tsx`) and the `market-nav.spec.ts`/`dashboard.spec.ts` text-assertion/comment/title diff; no logic touched, no partial state possible |

## Files Changed (Phase 4)

| File | Action | What Was Done |
|---|---|---|
| `app/(dashboard)/components/DashboardHeader.tsx` | Modified | Disclaimer paragraph (line ~26): `"...recomendación BUY/SELL derivada..."` -> `"...recomendación Compra/Venta/Sin recomendación derivada..."` (spec.md's exact pinned wording) |
| `app/dashboard/(with-footer)/inicio/page.tsx` | Modified | 2 prose edits: `"Cada recomendación BUY/SELL surge de un pipeline..."` -> `"Cada recomendación —Compra, Venta o Sin recomendación— surge de un pipeline..."`; `"...la decisión BUY/SELL nunca lo es."` -> `"...la decisión de Compra, Venta o Sin recomendación nunca lo es."` |
| `app/(dashboard)/components/PipelineDiagram.tsx` | Modified | `<desc>` text (line ~56): `"...agregación en una recomendación BUY/SELL."` -> `"...agregación en una recomendación de Compra, Venta o Sin recomendación."` |
| `tests/e2e/market-nav.spec.ts` | Modified | 2 disclaimer `toContainText` assertions (crypto view + placeholder-market view) updated to the new pinned string |
| `tests/e2e/dashboard.spec.ts` | Modified | 2 test titles + 2 descriptive comments translated (`BUY`/`SELL`/`ALL` prose words -> `Compra`/`Venta`/`Todos`); all `data-testid`/`data-recommendation` machine-identifier strings and fixture-literal `recommendation: 'BUY'/'SELL'` values left unchanged |

## Deviations from Design

One minor, harmless deviation from design.md's prose-edit count: design.md's
"Prose edits (exact before -> after)" table lists 3 rows for
`inicio/page.tsx` (`:43`, `:55`, and an unlabeled 3rd), but the file as it
exists today (post-`inicio-home-section`/`inicio-content-polish`/
`inicio-visual-and-scroll-fix` changes, all landed after design.md was
drafted) contains only 2 literal `BUY/SELL` occurrences — both edited. No
3rd occurrence exists in the current file; nothing was left un-translated.
Confirmed by a fresh grep of the file post-edit (0 remaining `BUY`/`SELL`
matches). No other deviation — `DashboardHeader.tsx` uses spec.md's exact
pinned slash-separated wording (not design.md's alternate phrasing, per the
phase instruction's explicit precedence rule), and `PipelineDiagram.tsx`
matches design.md's exact edit.

## Issues Found

None.

## Out of Scope for This Batch (explicitly not touched)

- Phase 5 final verification (`npx vitest run` full suite, `npx tsc --noEmit`
  full-project confirmation already done here as a sanity check but not the
  formal Phase 5 gate, D3 zero-diff self-check, spec-scenario self-check) —
  runs only after the orchestrator independently verifies and commits this
  Phase 4 diff.
- `openspec/specs/decision-dashboard/spec.md`, `openspec/specs/market-navigation/spec.md` (already written by `sdd-spec`; no edits made in this apply batch).

## Remaining Tasks

- [ ] Phase 5: Final Verification (after all 4 PRs merged) — tasks 5.1-5.3

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 4 / PR4 — remaining Spanish prose + e2e text sweep
- Boundary: starts from Phase 3's landed state (commit `214a0a5`), ends with all 6 Phase 4 tasks green (`npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts`, `npx tsc --noEmit`)
- Estimated review budget impact: within tasks.md's forecast for Phase 4 (lowest risk — copy-only, 5 files, no logic touched); orchestrator will independently verify (`npx tsc --noEmit`, `npx vitest run`, `npx playwright test`) and commit

## Status (cumulative)

29/32 total tasks complete (Phase 1: 12/12, Phase 2: 8/8, Phase 3: 3/3, Phase 4: 6/6, Phase 5: 0/3). Ready for orchestrator verification (`npx tsc --noEmit`, `npx vitest run`, `npx playwright test`) and commit. Not yet ready for `sdd-verify` on the full change — Phase 5 (final full-suite verification, run independently by the orchestrator after Phase 4 is committed) remains.
