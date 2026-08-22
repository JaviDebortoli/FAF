# decision-dashboard Specification

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

### Requirement: No-data UX (cache-miss empty state)

When `GET /api/decisions` has no cached report — before n8n's first successful `POST /api/cycle` after a deploy, or after a cache eviction with nothing pushed yet — the dashboard MUST show a user-facing, architecture-agnostic message (e.g. "Servicio momentáneamente no disponible" / "Sin datos disponibles en este momento"). This message MUST NOT name or imply n8n, cache, pull, or cycle mechanics. This is a distinct state from the existing "no active recommendations" / per-filter empty state, which implies data exists but nothing currently qualifies. Exact copy wording is a design/visual decision confirmed by manual review; this requirement fixes only the constraint the copy must satisfy.

#### Scenario: No cached report yet shows architecture-agnostic message
- GIVEN `GET /api/decisions` returns no cached report (first deploy before n8n's first cycle, or cache eviction with no data)
- WHEN the dashboard loads
- THEN it MUST render a user-facing message indicating the service is temporarily unavailable
- AND the rendered message MUST NOT contain the terms "n8n", "cache", "pull", or "cycle" (case-insensitive)

#### Scenario: No-data state is distinct from empty-filter state
- GIVEN a cached report exists with active recommendations, but the user's direction filter matches none of them
- WHEN the dashboard renders the filtered view
- THEN it MUST show the existing "no active recommendations" empty state, not the no-data/service-unavailable message
- AND the two states MUST use visibly different copy, so a user cannot confuse "backend has no data at all" with "nothing matches your filter"

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

### Requirement: Crypto dashboard route under market navigation

The Tier 1 card overview MUST mount under the canonical crypto market route (`/dashboard/crypto`), reachable directly or via the sidebar's Criptomonedas link. Bare `/dashboard` MUST land the user on the Inicio route (`/dashboard/inicio`) rather than directly on the Tier 1 overview, so the existing bookmark keeps working without a 404.
(Previously: reachable directly, via the Inicio route's CTA, or via the sidebar's Criptomonedas link — the Inicio route's CTA to `/dashboard/crypto` has been removed, so it is no longer a reachability path.)

#### Scenario: Overview mounts at the canonical crypto route
- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page loads
- THEN the Tier 1 card overview MUST render exactly as it does today at bare `/dashboard`

#### Scenario: Bare /dashboard lands on Inicio, not the overview directly
- GIVEN a user has `/dashboard` bookmarked
- WHEN they navigate to `/dashboard`
- THEN they MUST land on `/dashboard/inicio`, not directly on the Tier 1 card overview, and never a 404
- AND from there, navigating to `/dashboard/crypto` (via the sidebar link) MUST still show the same Tier 1 card overview, unchanged

### Requirement: Dual-needle gauge survives the navigation redesign

The `ScoreGauge` MUST continue to render both the σ⁺ needle and the σ⁻ needle, each positioned by its real computed value, unchanged by the introduction of the sidebar/market shell. The mockup's single-needle-plus-fixed-reference gauge MUST NOT be adopted.

#### Scenario: Both needles still render under the new shell
- GIVEN a BUY card for BTCUSDT rendered under `/dashboard/crypto`
- WHEN its gauge is inspected
- THEN both the σ⁺ needle and the σ⁻ needle MUST be present, each positioned from real computed values, not a fixed reference line

### Requirement: Card-grid breakpoints unchanged by the navigation redesign

The Tier 1 card grid MUST keep the `sm:grid-cols-2 lg:grid-cols-3` responsive breakpoints. The mockup's `md:grid-cols-2` breakpoint MUST NOT replace them.

#### Scenario: Grid still switches at sm/lg, not md
- GIVEN the Tier 1 overview rendered under the new sidebar shell
- WHEN the viewport is inspected across breakpoints
- THEN the card grid MUST switch to two columns at `sm` and three columns at `lg`, not at `md`

### Requirement: DirectionFilter wiring unchanged by the navigation redesign

The Todos/Compra/Venta/Sin recomendación direction filter MUST keep its existing real wiring — `role="group"`, `aria-pressed` reflecting selection state, and a functional `onClick` handler that updates the visible cards — across all four states. The mockup's static, unwired filter markup MUST NOT replace it.
(Previously: covered only three states — ALL/BUY/SELL, with English labels — not the fourth Sin recomendación state.)

#### Scenario: Filter remains functional under the new shell
- GIVEN Compra, Venta, and Sin recomendación cards are all visible under `/dashboard/crypto`
- WHEN the user clicks the "Venta" filter option
- THEN only Venta cards MUST remain visible
- AND the Venta control MUST have `aria-pressed="true"` while the others have `aria-pressed="false"`

#### Scenario: Sin recomendación filter isolates muted cards
- GIVEN cards of all four states are visible
- WHEN the user clicks the "Sin recomendación" filter option
- THEN only NO_RECOMMENDATION (muted) cards MUST remain visible
- AND the Sin recomendación control MUST have `aria-pressed="true"` while the others have `aria-pressed="false"`

### Requirement: Crypto view heading reflects market catalog label

The `/dashboard/crypto` view's `<h1>` MUST render the crypto market's catalog label (`MARKETS.crypto.label`, currently "Criptomonedas") instead of a hardcoded, decision-specific string. This MUST follow the same data-driven pattern `app/dashboard/[market]/page.tsx` already uses for every other market's `<h1>` (`{market.label}`), so the crypto view's heading source stays consistent with the rest of the market shell and cannot silently drift from the shared `MARKETS` catalog.

#### Scenario: Crypto h1 shows the catalog label

- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page renders
- THEN the `<h1>` MUST read "Criptomonedas"
- AND its value MUST come from `MARKETS.crypto.label`, not a separate hardcoded literal

#### Scenario: Heading updates if the catalog label changes

- GIVEN `MARKETS.crypto.label` is later changed in `lib/markets.ts`
- WHEN `/dashboard/crypto` renders
- THEN the `<h1>` MUST reflect the updated catalog value automatically, without a separate code edit to the crypto page's heading

### Requirement: Presentation-cache TTL survives the n8n inter-run gap

The presentation-cache TTL (`BETA_MS`, `src/cycle/latest.ts`'s `put`/`get` expiry) MUST remain longer
than n8n's configured inter-run interval, so that the "No-data UX (cache-miss empty state)" requirement
above is triggered only by a genuine absence of pushed data (first deploy before n8n's first cycle,
cache eviction, or a missed/delayed n8n run) — never by routine cache expiry between two consecutive
on-schedule runs.

#### Scenario: [MANUAL-VERIFICATION-ONLY] No spurious no-data state during a normal inter-run window

- GIVEN n8n is running unattended on its live, configured schedule (6h cadence) in production
- WHEN a user loads the dashboard at any point between two consecutive successful `POST /api/cycle`
  calls, including near the end of the inter-run window
- THEN the dashboard MUST NOT show the no-data/service-unavailable message ("Servicio momentáneamente
  no disponible") solely due to presentation-cache TTL expiry
- (Not automatable — no live multi-hour n8n execution/scheduling harness exists in this repo. If this
  scenario is not explicitly confirmed by the user in live production before archive, `sdd-verify`/
  `sdd-archive` MUST NOT mark this change PASS, per this project's manual-verification-gate norm.)
