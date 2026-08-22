# Delta for decision-dashboard

## MODIFIED Requirements

### Requirement: Multi-asset display
The dashboard MUST display Tier 1 cards, scoped to exactly one market at a time, for every asset present in that market's most recent data pushed by n8n via `POST /api/cycle`, regardless of recommendation direction, filterable across all four direction states (Todos/Compra/Venta/Sin recomendación) within a single view. Asset identity and card count MUST NOT be determined by any source-code-level configuration or enumerated list — only by what that market's last push contained. The mechanism `GET /api/decisions` uses to scope its response to one market (query parameter vs. route segment) is a design-time decision, resolved in `sdd-design`; either way, a market's view MUST NEVER include another market's decisions.
(Previously: displayed cards for every asset in the single global report, with no market scoping — accurate only while crypto was the sole real market.)

#### Scenario: Multiple active assets shown within one market
- GIVEN BTCUSDT is BUY and SOLUSDT is SELL in the same crypto cycle
- WHEN `/dashboard/crypto` loads
- THEN both cards MUST be visible in the same overview, filterable by direction

#### Scenario: Card count follows that market's last push, not source code
- GIVEN a market's most recent `POST /api/cycle` included 5 well-formed symbols, none of which are named anywhere in the app's source code
- WHEN that market's dashboard loads
- THEN Tier 1 MUST render one card for each of those 5 assets, with no dependency on a source-code-defined asset list

#### Scenario: One market's cards never appear on another market's view
- GIVEN both crypto and acciones have cached, non-empty decision reports
- WHEN a user views `/dashboard/acciones`
- THEN only acciones assets MUST be rendered, and no crypto asset (e.g. BTCUSDT) MUST appear
- AND `/dashboard/crypto` MUST likewise show only crypto assets, never any acciones ticker

### Requirement: Crypto dashboard route under market navigation

Every real market's Tier 1 card overview MUST mount under that market's canonical route (`/dashboard/{market-slug}`, currently `crypto` and `acciones`), each reachable directly or via the sidebar's corresponding link, and each rendering only that market's scoped decisions. Bare `/dashboard` MUST land the user on the Inicio route (`/dashboard/inicio`) rather than directly on any market's overview, so the existing bookmark keeps working without a 404.
(Previously: only `/dashboard/crypto` hosted a real Tier 1 overview; every other market, including `/dashboard/acciones`, rendered the shared `MarketPlaceholder`.)

#### Scenario: Overview mounts at the canonical crypto route
- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page loads
- THEN the Tier 1 card overview MUST render with crypto-scoped decisions, exactly as it does today

#### Scenario: Overview mounts at the canonical acciones route
- GIVEN a user navigates to `/dashboard/acciones`
- WHEN the page loads
- THEN the Tier 1 card overview MUST render with acciones-scoped decisions, replacing the prior `MarketPlaceholder`

#### Scenario: Bare /dashboard lands on Inicio, not any overview directly
- GIVEN a user has `/dashboard` bookmarked
- WHEN they navigate to `/dashboard`
- THEN they MUST land on `/dashboard/inicio`, never directly on `/dashboard/crypto` or `/dashboard/acciones`, and never a 404

### Requirement: Presentation-cache TTL survives the n8n inter-run gap

The presentation-cache TTL (`BETA_MS`, `src/cycle/latest.ts`'s `put`/`get` expiry) MUST remain longer than n8n's configured inter-run interval AND longer than the longest normal EOD gap either real market can produce (including a routine weekend, for both crypto and acciones now that both run on daily candles), so that the "No-data UX (cache-miss empty state)" requirement is triggered only by a genuine absence of pushed data — never by routine cache expiry between two consecutive on-schedule runs, and never by a normal weekend gap.
(Previously: sized only against n8n's 6h inter-run interval, with no consideration of a weekend/EOD gap, since crypto's continuous push made that gap irrelevant.)

#### Scenario: [MANUAL-VERIFICATION-ONLY] No spurious no-data state during a normal inter-run window
- GIVEN n8n is running unattended on its live, configured schedule (6h cadence) in production
- WHEN a user loads either market's dashboard at any point between two consecutive successful `POST /api/cycle` calls for that market
- THEN the dashboard MUST NOT show the no-data/service-unavailable message solely due to presentation-cache TTL expiry
- (Not automatable — no live multi-hour n8n execution/scheduling harness exists in this repo.)

#### Scenario: A normal weekend gap does not flip either market to no-data
- GIVEN the most recent successful push for a market landed before a routine market-closed weekend
- WHEN a user loads that market's dashboard on the following Monday, before the next push has landed
- THEN the dashboard MUST still render the stale-but-present cached report, not the no-data/service-unavailable message
