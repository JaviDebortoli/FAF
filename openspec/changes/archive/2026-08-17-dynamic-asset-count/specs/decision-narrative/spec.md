# Delta for decision-narrative — Dynamic Asset Count

## MODIFIED Requirements

### Requirement: Narrative endpoint contract
The system MUST expose `GET /api/decisions/[asset]/narrative`, running with `runtime='nodejs'` and `dynamic='force-dynamic'`, matching existing `app/api/*` route conventions. The asset symbol MUST be taken from the route param and validated against the format regex `^[A-Z0-9]{2,20}USDT$` before any model call — no enumerated allowlist gates it. The response body MUST be a streamed text response. The only input passed to the model MUST be the asset's current `Decision.trace` (evidences, rule IDs, argument labels, thesis scores) — structured symbolic/numeric data, never free text. `ANTHROPIC_API_KEY` MUST be read server-side only and MUST NOT reach the client bundle.
(Previously: "validated against the existing allowlist" — allowlist membership is replaced by format validation, per `dynamic-asset-count`.)

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

## Cross-reference

No other `decision-narrative` requirement (Spanish-language output, Visible AI-generated disclaimer, Graceful degradation on failure, Cost-mitigation caching) changes under `dynamic-asset-count`; they are unaffected and remain in force as currently specified.
