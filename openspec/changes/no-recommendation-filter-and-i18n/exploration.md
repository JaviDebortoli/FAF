# Exploration: no-recommendation-filter-and-i18n

## Current State

**Point 1 — filtering.** `app/(dashboard)/lib/select.ts`'s `selectActionable(report, direction)` hard-filters out every `Decision` with `recommendation === 'NO_RECOMMENDATION'` before applying the `Direction` (`'ALL'|'BUY'|'SELL'`) filter:

```ts
export function selectActionable(report: DecisionReport, direction: Direction = 'ALL'): Decision[] {
  const actionable = report.decisions.filter((d) => d.recommendation !== 'NO_RECOMMENDATION');
  if (direction === 'ALL') return actionable;
  return actionable.filter((d) => d.recommendation === direction);
}
```

`DirectionFilter.tsx` renders exactly `OPTIONS = ['ALL','BUY','SELL']`. `OverviewClient.tsx` calls `selectActionable(report,'ALL')` for `allActionable` (drives which `EmptyState` variant fires) and `selectActionable(report, direction)` for `visible`.

Two real coercion bugs were found that only surface once NO_RECOMMENDATION decisions are allowed to reach these components:
- `DecisionCard.tsx:23` — `const recommendation = decision.recommendation === 'BUY' ? 'BUY' : 'SELL';` mislabels NO_RECOMMENDATION as SELL.
- `ArgumentGraph.tsx:28` and `ThesisScores.tsx:16` — `winningThesis = decision.recommendation === 'BUY' ? 'bullish' : 'bearish';` mislabels NO_RECOMMENDATION as "bearish winning" in the Tier-2 graph/score highlight.

`RecommendationBadge.tsx` is typed `Extract<Recommendation,'BUY'|'SELL'>` (2-state only). `EmptyState.tsx` has 2 variants (`no-active`/`filtered`) whose meaning changes once NO_RECOMMENDATION assets always render a card — `no-active` becomes reachable only when `report.decisions.length === 0` (a genuinely empty report), not "everything happened to be inactive."

Design tokens available (`app/globals.css`): `--color-buy:#22c55e`, `--color-sell:#f43f5e`, `--color-inactive:#52525b`, `--color-muted:#a1a1aa`, `--color-threshold:#eab308`.

`openspec/specs/decision-dashboard/spec.md` pins the current behavior verbatim in **"Card overview (Tier 1)"**: *"Assets with `NO_RECOMMENDATION` MUST render no card of any kind"* + scenario "No card for NO_RECOMMENDATION". **"Multi-asset display"** repeats "active BUY or SELL recommendation" phrasing. `openspec/specs/market-navigation/spec.md`'s **"DirectionFilter wiring unchanged by the navigation redesign"** pins "The ALL/BUY/SELL direction filter MUST keep its existing real wiring." All three need MODIFIED deltas.

The narrative route (`app/api/decisions/[asset]/narrative/route.ts:187-188`) already returns `409 NOT_APPLICABLE` for NO_RECOMMENDATION assets, and `NarrativePanel.tsx`'s `UNAVAILABLE_CODES` set already includes `NOT_APPLICABLE` with calm copy ("La narrativa no está disponible para esta decisión."). This drilldown/narrative path needs **no change** — it was built defensively for exactly this case ahead of time.

**Point 2 — i18n.** `src/domain/types.ts:81` defines `Recommendation = 'BUY'|'SELL'|'NO_RECOMMENDATION'` with an existing inline comment `// COMPRAR / VENDER / SIN RECOMENDACION` — a strong prior signal the domain author already anticipated a display-only Spanish mapping without touching the type. `src/decision/policy.ts`'s `decide()` computes these literals per paper eq. 11 ("BUY iff sigma(mu+) >= theta AND... otherwise NO_RECOMMENDATION"), matching `openspec/config.yaml`'s rule "*Formulas and thresholds... must match the FAF paper exactly*" and golden tests (`tests/golden/paper-example.test.ts` asserts `'BUY'` against the paper's worked example at 1e-9 tolerance). `n8n/faf-workflow.json` has **zero** BUY/SELL/NO_RECOMMENDATION references — confirmed scheduler+raw-fetch only, no coupling to these literals. `NarrativeFacts.recommendation` (`src/narrative/facts.ts:36`) is also typed `'BUY'|'SELL'` and gets JSON-serialized into the Claude prompt as data.

`src/narrative/prompt.ts`'s `NARRATIVE_SYSTEM_PROMPT` (golden-tested byte-identical in `tests/narrative/prompt.test.ts`) is already fully Spanish, including "comprar/vender" in rule 4, but has **no explicit instruction forbidding the English words "BUY"/"SELL"** — since the JSON payload's `recommendation` field literally contains the string `"BUY"` or `"SELL"`, nothing currently stops the model from echoing that English token in generated prose. This is a real, confirmed gap requiring one added instruction line (and a matching golden-string update in the test).

English UI literals found (grep across `app/`, each file read in full): `DirectionFilter.tsx` (tab labels), `RecommendationBadge.tsx` (badge text), `EmptyState.tsx` (`direction?: 'BUY'|'SELL'` prop + interpolated text), `OverviewClient.tsx:128`, `DecisionCard.tsx:23`, `ArgumentGraph.tsx:28` (+ SVG `<desc>` interpolates raw `decision.recommendation`), `ThesisScores.tsx:16`, `DashboardHeader.tsx:26` (disclaimer prose, pinned verbatim in `openspec/specs/market-navigation/spec.md:173`, duplicated in `tests/e2e/market-nav.spec.ts:235,442`), `app/dashboard/(with-footer)/inicio/page.tsx:43,55` (body prose), `PipelineDiagram.tsx:56` (SVG `<desc>`). `tests/dashboard/lib/select.test.ts` and `tests/e2e/dashboard.spec.ts` assert English literal text directly (`.toContainText('BUY')`, `direction-filter-BUY`, etc.) and will break once translated.

## Affected Areas

- `app/(dashboard)/lib/select.ts` — filter/type change, rename recommended
- `app/(dashboard)/components/DirectionFilter.tsx` — 4th tab, Spanish labels
- `app/(dashboard)/components/OverviewClient.tsx` — drop actionable pre-filter, `EmptyState` logic rethink
- `app/(dashboard)/components/DecisionCard.tsx` — fix BUY/SELL coercion bug, 3-way badge
- `app/(dashboard)/components/RecommendationBadge.tsx` — accept full `Recommendation`, 3rd visual (`--color-inactive`)
- `app/(dashboard)/components/EmptyState.tsx` — variant semantics change, direction prop widen
- `app/(dashboard)/components/ArgumentGraph.tsx`, `ThesisScores.tsx` — fix `winningThesis` coercion bug
- `app/(dashboard)/components/DashboardHeader.tsx`, `app/dashboard/(with-footer)/inicio/page.tsx`, `PipelineDiagram.tsx` — Spanish prose
- NEW `app/(dashboard)/lib/i18n.ts` (or similar) — single display-mapping utility
- `src/narrative/prompt.ts` — add explicit anti-English-term instruction (golden test updates in lockstep)
- `openspec/specs/decision-dashboard/spec.md` — MODIFIED "Card overview (Tier 1)", "Multi-asset display"
- `openspec/specs/market-navigation/spec.md` — MODIFIED "DirectionFilter wiring", "Determinism disclaimer" pinned text
- `tests/dashboard/lib/select.test.ts` — full rewrite (semantics changed)
- `tests/e2e/dashboard.spec.ts` — lines ~288-304, ~337-345, ~352-365, ~398-447
- `tests/e2e/market-nav.spec.ts` — lines 235, 442 (disclaimer text)
- `tests/narrative/prompt.test.ts` — golden string update
- **Not affected (confirmed, stays English)**: `src/domain/types.ts`, `src/decision/policy.ts`, `src/laf/`, `src/stream/`, `src/cycle/`, `app/api/`, `n8n/faf-workflow.json`, `tests/golden/*.test.ts`, `tests/decision/policy.test.ts`, `tests/api/narrative.test.ts` fixtures, `tests/helpers/seedCycleCache.ts`

## Approaches

**Point 1 — selector redesign**
1. **Rename to `selectByDirection`, drop the actionable pre-filter, widen `Direction` to 4-way** *(recommended)*
   - Pros: simpler logic (`direction==='ALL' ? report.decisions : report.decisions.filter(d=>d.recommendation===direction)`), name matches new behavior, small blast radius (one real caller: `OverviewClient.tsx`)
   - Cons: touches doc comments/test names referencing "actionable"
   - Effort: Low
2. **Keep `selectActionable` name, silently change semantics**
   - Pros: zero rename churn
   - Cons: name becomes misleading (implies actionable-only even for `'ALL'`), regression risk for future readers
   - Effort: Low, higher long-term risk

**Point 2 — translation layer**
1. **Keep domain literals English everywhere in `src/`/`app/api/`; add ONE display-mapping utility used only by presentational components** *(recommended)*
   - Pros: zero domain/API/golden-test churn, matches `openspec/config.yaml`'s paper-fidelity rule, matches the existing inline comment in `types.ts` anticipating exactly this split, isolates i18n as one reviewable surface
   - Cons: two parallel vocabularies to keep straight (mitigated by one utility file + doc comment)
   - Effort: Medium (breadth of call sites, not depth)
2. **Change domain type literals to Spanish** (e.g. `'COMPRA'|'VENTA'|'SIN_RECOMENDACION'`)
   - Pros: none found
   - Cons: breaks `openspec/config.yaml`'s paper-fidelity rule, breaks golden tests, breaks n8n/API contract assumptions, touches dozens of test files
   - Effort: High — not recommended

## Recommendation

Point 1: Approach 1 (rename + widen `Direction`/`selectByDirection`). Point 2: Approach 1 (single display-mapping utility; domain stays English). Bundle the two coercion-bug fixes (`DecisionCard.tsx`, `ArgumentGraph.tsx`/`ThesisScores.tsx`) into this change since they're exposed by removing the NO_RECOMMENDATION-hide invariant — for `winningThesis`, replace `recommendation === 'BUY'` with `sigmaPlus >= sigmaMinus`, which is equivalent for BUY/SELL and generalizes correctly for NO_RECOMMENDATION (shows the "leading" side even below threshold). Spanish terminology: **"Compra"/"Venta"** (nouns, Title Case source — existing Tailwind `uppercase` classes already render them capitalized) for badge/tab chip labels, distinct from narrative prose which correctly keeps verb forms "comprar/vender"; **"Todos"** for ALL (agrees with masculine "activos"); **"Sin recomendación"** for the 3rd state (matches `types.ts`'s own inline comment, accent corrected).

## Risks

- Removing the NO_RECOMMENDATION card-hide invariant reverses a decision explicitly confirmed earlier this session — the proposal needs an explicit sign-off callout, not a silent reversal.
- The two recommendation-coercion bugs (`DecisionCard.tsx`, `ArgumentGraph.tsx`/`ThesisScores.tsx`) must be fixed as part of this change, not left latent.
- `EmptyState` "no-active" variant becomes nearly unreachable in normal operation — needs explicit re-scoping in the spec delta (only fires when `report.decisions.length === 0`).
- Large, precise test-assertion catalog (unit + e2e) breaks the moment English strings change — must land in the same slice as the component changes to avoid a red-suite window.
- `tests/narrative/prompt.test.ts`'s golden-string equality check will break as soon as the anti-English-term instruction is added — expected, must update in lockstep.

## Key Learnings

1. `src/domain/types.ts` already carries an inline comment anticipating a Spanish display mapping (`COMPRAR/VENDER/SIN RECOMENDACION`), confirming domain literals should stay English.
2. `DecisionCard.tsx` and `ArgumentGraph.tsx`/`ThesisScores.tsx` both coerce non-BUY recommendations to SELL/bearish, a latent bug only exposed once NO_RECOMMENDATION assets become renderable/clickable.
3. The narrative route and `NarrativePanel.tsx` already handle NO_RECOMMENDATION assets gracefully via a `409 NOT_APPLICABLE` code and calm unavailable-state copy, requiring no change.
4. `n8n/faf-workflow.json` contains zero BUY/SELL/NO_RECOMMENDATION references, confirming the n8n integration has no coupling to these literals.
5. `NARRATIVE_SYSTEM_PROMPT` is fully Spanish already but never explicitly forbids the model from echoing the English "BUY"/"SELL" tokens present in the JSON payload it receives.

## Ready for Proposal

Yes — scope, affected files, terminology, and both design-decision reversals (visibility + selector redesign) are concrete enough for `sdd-propose` to draft `proposal.md`, with explicit sign-off callouts for: (a) reversing "NO_RECOMMENDATION never shows", (b) the two bundled coercion-bug fixes, (c) the domain-stays-English / display-layer-translates architecture.
