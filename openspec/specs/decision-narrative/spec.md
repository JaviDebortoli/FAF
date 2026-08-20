# decision-narrative Specification

## Purpose

Server-side generation of a Spanish-language LLM narrative explaining a single asset's current decision, exposed exclusively for Tier 2 drill-down consumption (`decision-dashboard`'s Tier 2 requirement), per proposal Deviation D7. New capability; no prior spec exists for this domain.

## Requirements

### Requirement: Narrative endpoint contract
The system MUST expose `GET /api/decisions/[asset]/narrative`, running with `runtime='nodejs'` and `dynamic='force-dynamic'`, matching existing `app/api/*` route conventions. The asset symbol MUST be taken from the route param and validated against the format regex `^[A-Z0-9]{2,20}USDT$` before any model call — no enumerated allowlist gates it. The response body MUST be a streamed text response. The only input passed to the model MUST be the asset's current `Decision.trace` (evidences, rule IDs, argument labels, thesis scores) — structured symbolic/numeric data, never free text. `ANTHROPIC_API_KEY` MUST be read server-side only and MUST NOT reach the client bundle.

#### Scenario: Valid asset streams narrative
- GIVEN BTCUSDT has an active BUY decision
- WHEN `GET /api/decisions/BTCUSDT/narrative` is called
- THEN the response MUST stream text derived from BTCUSDT's current trace

#### Scenario: Malformed symbol rejected
- GIVEN "DOGE-USDT" fails the format regex `^[A-Z0-9]{2,20}USDT$`
- WHEN `GET /api/decisions/DOGE-USDT/narrative` is called
- THEN the response MUST be a 400 with error code `BAD_ASSET`, not a narrative

#### Scenario: Well-formed but unknown symbol yields no-decision, not a format error
- GIVEN "DOGEUSDT" is well-formed (passes the format regex) but has no current decision, because n8n has never pushed it
- WHEN `GET /api/decisions/DOGEUSDT/narrative` is called
- THEN the response MUST NOT be the same error family as a malformed symbol (400 `BAD_ASSET`)
- AND MUST instead indicate no decision exists for that asset

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

### Requirement: Narrative quality manual verification (Haiku 4.5 swap)

Because the Tier 2 narrative model changed from Claude Opus 5 to Haiku 4.5
(cost-driven restatement-tier swap), this change MUST NOT be marked PASS at
archive until a human has manually confirmed the Haiku 4.5 Spanish narrative
output is acceptable relative to the prior Opus 5 baseline. Automated tests
can verify the call succeeds and forwards `text_delta` text, but cannot judge
narrative quality.

#### Scenario: [MANUAL-VERIFICATION-ONLY] Haiku 4.5 narrative quality confirmed against Opus 5 baseline

- GIVEN `src/narrative/client.ts` now calls `claude-haiku-4-5` instead of `claude-opus-5`
- WHEN a Spanish narrative is generated for a live asset decision
- THEN the user MUST manually read the generated narrative and confirm it reads acceptably compared to the prior Opus 5 baseline
- (Not automatable — no automated rubric exists in this repo to judge Spanish prose quality. If this scenario is not explicitly confirmed by the user before archive, `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS, per this project's manual-verification-gate norm.)
