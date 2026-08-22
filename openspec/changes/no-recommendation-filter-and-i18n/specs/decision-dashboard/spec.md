# Delta for decision-dashboard

## MODIFIED Requirements

### Requirement: Card overview (Tier 1)
The system MUST render a Tier 1 overview as one card per asset present in the current report, regardless of recommendation direction (`Decision.recommendation` is `'BUY'`, `'SELL'`, or `'NO_RECOMMENDATION'`). Each card MUST show a badge reflecting its recommendation state — "Compra" for BUY, "Venta" for SELL, "Sin recomendación" for NO_RECOMMENDATION — an SVG gauge comparing σ(μ⁺) and σ(μ⁻) against θ=0.67, and an SVG price sparkline built from `trace.candles`. A `NO_RECOMMENDATION` card MUST use a visually distinct, muted/inactive styling (the `--color-inactive` design token) instead of the BUY/SELL badge treatment, so it reads as inactive without implying a directional recommendation. The overview MUST be filterable by recommendation direction across all four states (Todos/Compra/Venta/Sin recomendación). If the current report contains zero decisions, the overview MUST show an explicit empty state instead of a blank page.
(Previously: only assets with an active BUY or SELL recommendation rendered a card at all; `NO_RECOMMENDATION` assets rendered no card, placeholder, or empty card of any kind, and the direction filter covered only BUY/SELL.)

#### Scenario: Card rendered for active recommendation
- GIVEN a decision cycle emitted BUY for BTCUSDT
- WHEN the dashboard loads
- THEN a card for BTCUSDT MUST show a "Compra" badge, a σ⁺/σ⁻-vs-θ gauge, and a sparkline

#### Scenario: Muted card rendered for NO_RECOMMENDATION
- GIVEN ETHUSDT's latest decision is NO_RECOMMENDATION
- WHEN the dashboard loads
- THEN a card for ETHUSDT MUST render using the muted/inactive `--color-inactive` styling with a "Sin recomendación" badge, not a BUY/SELL-style badge, and MUST NOT be omitted from the overview

#### Scenario: All assets inactive
- GIVEN every configured asset's latest decision is NO_RECOMMENDATION
- WHEN the dashboard loads
- THEN the overview MUST still render one muted card per asset, not an empty state (an empty state fires only when the report has zero decisions)

#### Scenario: Direction filter
- GIVEN BUY, SELL, and NO_RECOMMENDATION cards are all visible
- WHEN the user filters by "Sin recomendación"
- THEN only NO_RECOMMENDATION cards MUST remain visible

### Requirement: Tier 2 drill-down
Clicking a Tier 1 card MUST open a detail view for that asset showing (a) a bounded SVG render of the fixed topology already in the system (8 evidence leaves → 2 RA groups → 1 CA, per `src/laf/graph.ts`/`src/laf/rules.ts`) for that asset's current decision, and (b) a narrative section sourced from `GET /api/decisions/[asset]/narrative`, fetched lazily only when the drill-down opens (never prefetched, never fetched for Tier 1 cards). The leading/winning thesis highlighted in the graph and score display MUST be determined by directly comparing σ(μ⁺) and σ(μ⁻) — whichever is greater is the leading thesis — and MUST NOT be inferred from the card's recommendation label. This applies identically for BUY, SELL, and NO_RECOMMENDATION assets; NO_RECOMMENDATION cards remain clickable and open this same drill-down.
(Previously: rendered the argument trace as structured tabular data with no graph render and no narrative; leading-thesis highlight logic was unspecified and, in implementation, defaulted to treating any non-BUY recommendation as bearish.)

#### Scenario: Drill-down opens graph
- GIVEN a Tier 1 BUY card for BTCUSDT
- WHEN the user opens its drill-down
- THEN the graph MUST render BTCUSDT's 8 leaves, 2 RA groups, and 1 CA node matching its current trace

#### Scenario: Narrative fetched lazily
- GIVEN the dashboard has loaded and no drill-down is open
- WHEN no card has been clicked
- THEN no call to `GET /api/decisions/[asset]/narrative` MUST have been made

#### Scenario: Fixed topology only, not a generic graph editor
- GIVEN a drill-down is open
- WHEN the graph renders
- THEN it MUST be a bounded, non-editable SVG of the fixed 8/2/1 topology for one asset, not a generic graph editor or multi-decision history view

#### Scenario: Leading thesis highlight matches real score comparison, not the recommendation label
- GIVEN a NO_RECOMMENDATION asset whose σ(μ⁺) is greater than σ(μ⁻), both below θ
- WHEN the user opens its drill-down
- THEN the bullish/σ⁺ thesis MUST be highlighted as leading, not the bearish/σ⁻ thesis by default

#### Scenario: NO_RECOMMENDATION card opens its drill-down
- GIVEN a Tier 1 card for a NO_RECOMMENDATION asset
- WHEN the user clicks it
- THEN the drill-down MUST open, showing the graph/scores plus the existing narrative "no disponible" state for that asset (via the narrative endpoint's existing 409 NOT_APPLICABLE handling)

### Requirement: Multi-asset display
The dashboard MUST display Tier 1 cards for every asset present in the most recent data pushed by n8n via `POST /api/cycle`, regardless of recommendation direction, filterable across all four direction states (Todos/Compra/Venta/Sin recomendación) within a single view. Asset identity and card count MUST NOT be determined by any source-code-level configuration or enumerated list — only by what n8n's last push contained.
(Previously: only assets with an active BUY or SELL recommendation contributed a card; NO_RECOMMENDATION assets contributed no card.)

#### Scenario: Multiple active assets shown
- GIVEN BTCUSDT is BUY and SOLUSDT is SELL in the same cycle
- WHEN the dashboard loads
- THEN both cards MUST be visible in the same overview, filterable by direction

#### Scenario: Card count follows n8n's last push, not source code
- GIVEN n8n's most recent `POST /api/cycle` included 5 well-formed symbols, none of which are named anywhere in the app's source code
- WHEN the dashboard loads
- THEN Tier 1 MUST render one card for each of those 5 assets, regardless of recommendation direction, with no dependency on a source-code-defined asset list
