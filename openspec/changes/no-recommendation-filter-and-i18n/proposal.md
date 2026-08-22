# Proposal: no-recommendation-filter-and-i18n — restore NO_RECOMMENDATION visibility + Spanish UI

## Intent

Two bundled asks from the user: (1) Tier 1 currently hides every `NO_RECOMMENDATION` asset outright; the user wants all assets visible again, plus a dedicated 4th filter tab to isolate the no-recommendation ones. (2) The dashboard UI (badges, tabs, headers, AI narrative) is still in English; the user wants it in Spanish. Point 1 requires reversing a decision made earlier this session. Point 2 requires deciding how far translation reaches into the codebase without breaking paper fidelity.

## Decisions Requiring Sign-Off

**D1 — Reversal of "NO_RECOMMENDATION never shows".** This proposal reverses the `decision-dashboard` spec's current pinned requirement: *"Assets with `NO_RECOMMENDATION` MUST render no card of any kind"* (confirmed design decision, currently in force). The new behavior: all assets render a card in ALL/BUY/SELL/no-recommendation tabs, with `NO_RECOMMENDATION` cards visually distinct (`--color-inactive` token, no BUY/SELL badge). This is not an implementation detail — it undoes a prior explicit product decision and needs the user's explicit re-confirmation before `sdd-spec` writes the MODIFIED delta.

**D2 — Two pre-existing coercion bugs get fixed in this change, not deferred.** `DecisionCard.tsx` (`recommendation === 'BUY' ? 'BUY' : 'SELL'`) and `ArgumentGraph.tsx`/`ThesisScores.tsx` (`winningThesis = recommendation === 'BUY' ? 'bullish' : 'bearish'`) both silently mislabel `NO_RECOMMENDATION` as SELL/bearish today. This bug is currently invisible because the hide-invariant in D1 prevents any `NO_RECOMMENDATION` asset from ever reaching these components. Reversing D1 makes the bug user-visible and clickable for the first time, so it must ship in the same slice — a card correctly labeled "no recommendation" that then opens a drill-down showing a fabricated "bearish" reading would be a worse regression than the current hide-everything behavior. Fix: replace `recommendation === 'BUY'` with `sigmaPlus >= sigmaMinus` for `winningThesis` (equivalent for BUY/SELL, generalizes correctly below threshold), and widen `DecisionCard`'s badge to a real 3-way switch.

**D3 — Domain stays English; only the display layer translates.** `Decision.recommendation`'s literal values (`'BUY'|'SELL'|'NO_RECOMMENDATION'`) in `src/domain/types.ts`, `src/decision/policy.ts`, LAF rules, API contracts, and all golden tests remain unchanged in English. Reason: `openspec/config.yaml` requires formulas/labels to match the FAF paper exactly, and `tests/golden/paper-example.test.ts` pins `'BUY'` at 1e-9 tolerance against the paper's worked example — renaming the domain type would be a full domain/API/test rewrite for what is fundamentally a display-text request. Instead, one new mapping utility (used only by presentational components) converts the English literal to Spanish at render time. `types.ts` already carries an inline comment anticipating exactly this split.

**Proposed Spanish terminology (please correct before it propagates to specs/design/tests):**

| English | Spanish | Where used |
|---|---|---|
| BUY (badge/tab, noun form) | Compra | `RecommendationBadge`, `DirectionFilter` tab |
| SELL (badge/tab, noun form) | Venta | `RecommendationBadge`, `DirectionFilter` tab |
| NO_RECOMMENDATION (badge/tab) | Sin recomendación | `RecommendationBadge`, new 4th tab |
| ALL (tab) | Todos | `DirectionFilter` tab |
| buy/sell (narrative verb form — unchanged) | comprar/vender | `NARRATIVE_SYSTEM_PROMPT` (already correct) |

## Scope

### In Scope
- `selectByDirection(report, direction)` in `lib/select.ts`: rename from `selectActionable`, drop the `NO_RECOMMENDATION` pre-filter, widen `Direction` to `'ALL'|'BUY'|'SELL'|'NO_RECOMMENDATION'`.
- `DirectionFilter.tsx`: 4th tab for the no-recommendation state; Spanish labels for all 4.
- `OverviewClient.tsx`: drop the actionable pre-filter; rescope `EmptyState`'s `no-active` variant to fire only when `report.decisions.length === 0` (a genuinely empty report), not "everything happened to be inactive."
- `DecisionCard.tsx`: fix the BUY/SELL coercion bug (D2), add a real 3-way badge/visual state.
- `RecommendationBadge.tsx`: accept the full `Recommendation` union, add a 3rd visual using `--color-inactive`.
- `ArgumentGraph.tsx`, `ThesisScores.tsx`: fix `winningThesis` coercion bug (D2).
- New `app/(dashboard)/lib/i18n.ts` (or similar): single display-mapping utility (D3), used by all components above plus `DashboardHeader.tsx` and `app/dashboard/(with-footer)/inicio/page.tsx` prose, `PipelineDiagram.tsx` SVG `<desc>`.
- `src/narrative/prompt.ts`: add one instruction line forbidding the English tokens "BUY"/"SELL" in generated prose (the JSON payload it receives literally contains them); update the golden-string test in lockstep.
- Spec deltas: `openspec/specs/decision-dashboard/spec.md` ("Card overview (Tier 1)", "Multi-asset display"), `openspec/specs/market-navigation/spec.md` ("DirectionFilter wiring unchanged...", "Determinism disclaimer" pinned copy — currently contains the English "BUY/SELL").
- Test updates: `tests/dashboard/lib/select.test.ts` (rewrite — semantics changed), `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts` (disclaimer text), `tests/narrative/prompt.test.ts` (golden string).

### Out of Scope
- Any change to `Decision.recommendation`'s literal values, `src/decision/policy.ts`, LAF rules, `app/api/*` contracts, or any golden/policy test (D3).
- `NarrativePanel.tsx`'s existing `409 NOT_APPLICABLE` handling for `NO_RECOMMENDATION` assets — already correct, defensively built ahead of this change, needs no modification.
- `n8n/faf-workflow.json` — confirmed zero coupling to BUY/SELL/NO_RECOMMENDATION literals.
- Any broader i18n framework (locale files, `next-intl`, language switcher) — this is a one-time hardcoded Spanish text sweep, not internationalization infrastructure.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `decision-dashboard`: "Card overview (Tier 1)" reverses the NO_RECOMMENDATION hide rule (D1) and adds the 3-way visual/badge state; "Multi-asset display" drops the "active BUY or SELL" card-eligibility phrasing.
- `market-navigation`: "DirectionFilter wiring unchanged by the navigation redesign" gains the 4th tab; "Determinism disclaimer appears on every market view" pinned copy translates its English "BUY/SELL" reference to Spanish.

## Approach

Point 1: rename+widen the selector (recommended in exploration — smaller blast radius than keeping the old name with new semantics), let all 4 states render, fix the two coercion bugs that removing the hide-invariant exposes. Point 2: one display-mapping utility isolates all Spanish text as a single reviewable surface; domain/API/tests stay untouched English per D3.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(dashboard)/lib/select.ts` | Modified | Rename + widen `Direction`, drop pre-filter |
| `app/(dashboard)/components/DirectionFilter.tsx` | Modified | 4th tab, Spanish labels |
| `app/(dashboard)/components/OverviewClient.tsx` | Modified | Drop pre-filter, rescope `EmptyState` logic |
| `app/(dashboard)/components/DecisionCard.tsx` | Modified | Fix BUY/SELL coercion bug (D2), 3-way badge |
| `app/(dashboard)/components/RecommendationBadge.tsx` | Modified | Accept full `Recommendation`, 3rd visual |
| `app/(dashboard)/components/EmptyState.tsx` | Modified | Variant semantics narrowed |
| `app/(dashboard)/components/ArgumentGraph.tsx`, `ThesisScores.tsx` | Modified | Fix `winningThesis` coercion bug (D2) |
| `app/(dashboard)/components/DashboardHeader.tsx`, `app/dashboard/(with-footer)/inicio/page.tsx`, `PipelineDiagram.tsx` | Modified | Spanish prose |
| `app/(dashboard)/lib/i18n.ts` (new) | New | Single display-mapping utility (D3) |
| `src/narrative/prompt.ts` | Modified | Anti-English-term instruction, golden test update |
| `openspec/specs/decision-dashboard/spec.md`, `openspec/specs/market-navigation/spec.md` | Modified | Deltas per Capabilities section |
| `tests/dashboard/lib/select.test.ts`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts`, `tests/narrative/prompt.test.ts` | Modified | Assertions updated for new semantics/text |
| `src/domain/types.ts`, `src/decision/policy.ts`, `app/api/*`, `tests/golden/*`, `n8n/faf-workflow.json` | Unchanged | Confirmed no coupling (D3) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| D1 reversal surprises anyone expecting the prior confirmed behavior | Med | Explicit sign-off callout above; must be confirmed before `sdd-spec` |
| Coercion-bug fix changes visible drill-down content for existing BUY/SELL assets (not just NO_RECOMMENDATION) if `sigmaPlus >= sigmaMinus` ever disagrees with `recommendation === 'BUY'` at the boundary | Low | They are mathematically equivalent for BUY/SELL per policy.ts's own threshold logic; add a regression test asserting agreement on existing golden fixtures |
| Test-assertion catalog (unit + e2e) breaks the moment English strings change | High (expected) | Must land in the same PR/slice as the component changes to avoid a red-suite window |
| Spanish terminology (Compra/Venta/Todos/Sin recomendación) is wrong or inconsistent with existing product vocabulary | Med | Table above is a draft pending explicit user correction |
| PR review budget — large surface (selector, 2 bug fixes, 4th tab, i18n utility, prompt change, 2 spec deltas, 4 test files) | High | `sdd-tasks` should slice into phases (filter logic, bug fixes, i18n sweep, narrative prompt) |

## Rollback Plan

Revert the branch/PR(s). No schema, cache, or reasoning-core change — `Decision`/`DecisionReport`, `src/decision/policy.ts`, and every route below `GET /api/decisions` are untouched. Reverting restores the prior hide-invariant and English text with no data migration.

## Dependencies

- None external.

## Success Criteria

- [ ] All 4 tabs (Todos/Compra/Venta/Sin recomendación) render correctly-filtered cards, including a visually distinct card for `NO_RECOMMENDATION`.
- [ ] `DecisionCard.tsx` and `ArgumentGraph.tsx`/`ThesisScores.tsx` no longer mislabel `NO_RECOMMENDATION` as SELL/bearish.
- [ ] `Decision.recommendation` literal values, `src/decision/policy.ts`, and all golden tests remain byte-identical in English.
- [ ] All dashboard UI text (badges, tabs, headers, disclaimer, AI narrative) renders in Spanish; narrative prose never echoes the literal English tokens "BUY"/"SELL".
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` all green (Strict TDD Mode).

## Proposal question round

D1–D3 above are the three decisions genuinely requiring explicit sign-off before `sdd-spec`. In addition:

1. Is the Spanish terminology table (Compra/Venta/Todos/Sin recomendación) correct, or does the product have existing preferred wording elsewhere (e.g. marketing copy, thesis document) that should override it?
2. For the `NO_RECOMMENDATION` card's visual treatment — is a muted/inactive-styled card with no BUY/SELL badge sufficient, or is there a specific visual requirement (e.g. an explicit "sin señal" icon) the user wants?
3. Should the drill-down/narrative click-through remain enabled for `NO_RECOMMENDATION` cards (it already gracefully shows "no disponible" via the existing 409 handling), or should the card be non-clickable entirely now that it's visible in Tier 1?

If unanswered, this proposal proceeds with: the terminology table as drafted, a muted card with no badge (reusing `--color-inactive`), and drill-down left clickable (reusing the existing graceful 409 UX, requiring no new code).
