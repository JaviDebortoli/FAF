# Delta for decision-dashboard — Dynamic Asset Count

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Multi-asset display
The dashboard MUST display Tier 1 cards for every asset present in the most recent data pushed by n8n via `POST /api/cycle` that currently has an active BUY or SELL recommendation, filterable by direction within a single view; assets without an active recommendation contribute no card, per the Card overview requirement above. Asset identity and card count MUST NOT be determined by any source-code-level configuration or enumerated list — only by what n8n's last push contained.
(Previously: "every configured asset" implied a fixed, source-code-defined set; asset membership is now entirely determined by n8n's last push, per `dynamic-asset-count`.)

#### Scenario: Multiple active assets shown
- GIVEN BTCUSDT is BUY and SOLUSDT is SELL in the same cycle
- WHEN the dashboard loads
- THEN both cards MUST be visible in the same overview, filterable by direction

#### Scenario: Card count follows n8n's last push, not source code
- GIVEN n8n's most recent `POST /api/cycle` included 5 well-formed symbols, none of which are named anywhere in the app's source code
- WHEN the dashboard loads
- THEN Tier 1 MUST render cards for however many of those 5 assets have an active BUY/SELL recommendation, with no dependency on a source-code-defined asset list

## Cross-reference

No other `decision-dashboard` requirement (Card overview, Tier 2 drill-down, LLM narrative/graph confinement to Tier 2) changes under `dynamic-asset-count`; they are unaffected and remain in force as currently specified.
