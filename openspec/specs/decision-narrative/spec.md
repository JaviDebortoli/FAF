# decision-narrative Specification

## Purpose

Server-side generation of a Spanish-language LLM narrative explaining a single asset's current decision, exposed exclusively for Tier 2 drill-down consumption (`decision-dashboard`'s Tier 2 requirement), per proposal Deviation D7. New capability; no prior spec exists for this domain.

## Requirements

### Requirement: Narrative endpoint contract
The system MUST expose `GET /api/decisions/[asset]/narrative`, running with `runtime='nodejs'` and `dynamic='force-dynamic'`, matching existing `app/api/*` route conventions. The asset symbol MUST be taken from the route param and validated against the existing allowlist before any model call. The response body MUST be a streamed text response. The only input passed to the model MUST be the asset's current `Decision.trace` (evidences, rule IDs, argument labels, thesis scores) — structured symbolic/numeric data, never free text. `ANTHROPIC_API_KEY` MUST be read server-side only and MUST NOT reach the client bundle.

#### Scenario: Valid asset streams narrative
- GIVEN BTCUSDT has an active BUY decision
- WHEN `GET /api/decisions/BTCUSDT/narrative` is called
- THEN the response MUST stream text derived from BTCUSDT's current trace

#### Scenario: Unknown asset rejected
- GIVEN "DOGEUSDT" is not in the allowlist
- WHEN `GET /api/decisions/DOGEUSDT/narrative` is called
- THEN the response MUST be an error status, not a narrative

### Requirement: Spanish-language output
The generated narrative MUST be written in Spanish.

#### Scenario: Narrative language
- GIVEN a narrative is generated for any asset's decision
- WHEN the response text is inspected
- THEN it MUST be in Spanish

### Requirement: Visible AI-generated disclaimer
Any UI surface displaying the narrative MUST show a visible disclaimer identifying it as an AI-generated explanation, clearly distinguished from the deterministic σ/label values shown alongside it, which are never LLM-derived.

#### Scenario: Disclaimer shown with narrative
- GIVEN a Tier 2 drill-down renders a narrative
- WHEN the narrative section is displayed
- THEN a visible "generado por IA" disclaimer MUST accompany it, visually separated from the deterministic score/label display

### Requirement: Graceful degradation on failure
If the Claude API call fails, times out, or `ANTHROPIC_API_KEY` is absent, this MUST NOT prevent the rest of the Tier 2 drill-down (graph, scores) from rendering; the narrative section MUST instead show an unavailable state.

#### Scenario: API key absent
- GIVEN `ANTHROPIC_API_KEY` is not set
- WHEN a drill-down requests the narrative
- THEN the graph and scores MUST still render, and the narrative section MUST show a "no disponible" state

#### Scenario: Claude API call fails
- GIVEN the Claude API returns an error or times out
- WHEN the narrative endpoint is called
- THEN the drill-down MUST NOT break, and the narrative section MUST show a "no disponible" state instead of blocking the graph or scores

### Requirement: Cost-mitigation caching
The system MUST cache a generated narrative per `(asset, t)` for the current decision, valid within the same window the decision itself is cached (β, mirroring `src/cycle/latest.ts`'s put/get/ttl pattern), so repeated drill-down opens for the same decision instance MUST NOT re-invoke the Claude API.

#### Scenario: Repeated open reuses cached narrative
- GIVEN a narrative was already generated for BTCUSDT's decision at time t within the current β window
- WHEN the drill-down for BTCUSDT is opened again before the decision changes
- THEN the cached narrative MUST be served without a new Claude API call

#### Scenario: New decision invalidates cache
- GIVEN a new cycle produces a decision with a different `t` for BTCUSDT
- WHEN the drill-down opens
- THEN the endpoint MUST generate a fresh narrative rather than serving the stale cached one
