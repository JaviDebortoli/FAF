# Delta for decision-dashboard

## MODIFIED Requirements

### Requirement: Card overview (Tier 1)
The system MUST render a Tier 1 overview as one card per asset that currently has an active BUY or SELL recommendation (`Decision.recommendation !== 'NO_RECOMMENDATION'`). Assets with `NO_RECOMMENDATION` MUST render no card of any kind (not a placeholder, not an empty card). Each card MUST show a BUY/SELL badge, an SVG gauge comparing σ(μ⁺) and σ(μ⁻) against θ=0.67, and an SVG price sparkline built from `trace.candles`. The overview MUST be filterable by recommendation direction (BUY or SELL only — `NO_RECOMMENDATION` never produces a filterable card). If every configured asset is `NO_RECOMMENDATION`, the overview MUST show an explicit "no active recommendations" empty state instead of a blank page.
(Previously: rendered a table of ALL decisions, including NO_RECOMMENDATION rows, with asset/timestamp/label/scores/gap columns.)

#### Scenario: Card rendered for active recommendation
- GIVEN a decision cycle emitted BUY for BTCUSDT
- WHEN the dashboard loads
- THEN a card for BTCUSDT MUST show a BUY badge, a σ⁺/σ⁻-vs-θ gauge, and a sparkline

#### Scenario: No card for NO_RECOMMENDATION
- GIVEN ETHUSDT's latest decision is NO_RECOMMENDATION
- WHEN the dashboard loads
- THEN no card, placeholder, or empty card MUST render for ETHUSDT

#### Scenario: All assets inactive
- GIVEN every configured asset's latest decision is NO_RECOMMENDATION
- WHEN the dashboard loads
- THEN the overview MUST show an explicit "no active recommendations" empty state, not a blank page

#### Scenario: Direction filter
- GIVEN both BUY and SELL cards are visible
- WHEN the user filters by SELL
- THEN only SELL cards MUST remain visible

### Requirement: Tier 2 drill-down
Clicking a Tier 1 card MUST open a detail view for that asset showing (a) a bounded SVG render of the fixed topology already in the system (8 evidence leaves → 2 RA groups → 1 CA, per `src/laf/graph.ts`/`src/laf/rules.ts`) for that asset's current decision, and (b) a narrative section sourced from `GET /api/decisions/[asset]/narrative`, fetched lazily only when the drill-down opens (never prefetched, never fetched for Tier 1 cards).
(Previously: rendered the argument trace as structured tabular data — active predicates with γ/ρ, triggered rules, argument labels, aggregated/net λ — with no graph render and no narrative.)

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

### Requirement: LLM narrative and graph visualization confined to Tier 2
The Tier 1 overview MUST remain fully deterministic: it MUST NOT include any LLM-generated text and MUST NOT include any interactive node-edge graph visualization, per PRD deviation D3. Per deviation D7, this restriction is narrowed — NOT reversed — so that it applies to Tier 1 only: LLM narrative text and the fixed-topology graph visualization ARE permitted, but strictly and only inside an open Tier 2 drill-down for the asset being inspected. D3's ban remains in force everywhere in the dashboard except inside that one Tier 2 surface; it is never lifted for Tier 1, and it is never lifted globally.
(Previously: banned LLM narrative and graph visualization everywhere in the dashboard, per D3, with no exemption.)

#### Scenario: Tier 1 stays deterministic
- GIVEN the Tier 1 overview is rendered
- WHEN a user inspects any card without opening its drill-down
- THEN no LLM-authored text and no node-edge graph component MUST be present anywhere in Tier 1

#### Scenario: Tier 2 exemption is scoped, not global
- GIVEN a Tier 2 drill-down is open for one asset
- WHEN its graph and narrative render
- THEN the LLM narrative and graph MUST be scoped to that drill-down only, and MUST NOT leak into, persist on, or appear on the Tier 1 overview once the drill-down closes

### Requirement: Multi-asset display
The dashboard MUST display Tier 1 cards for every configured asset that currently has an active BUY or SELL recommendation, filterable by direction within a single view; assets without an active recommendation contribute no card, per the Card overview requirement above.
(Previously: required decisions for all configured assets be visible or filterable within the same table, without excluding NO_RECOMMENDATION assets.)

#### Scenario: Multiple active assets shown
- GIVEN BTCUSDT is BUY and SOLUSDT is SELL in the same cycle
- WHEN the dashboard loads
- THEN both cards MUST be visible in the same overview, filterable by direction
