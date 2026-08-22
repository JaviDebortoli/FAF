# Delta for decision-narrative

## MODIFIED Requirements

### Requirement: Narrative endpoint contract
The system MUST expose `GET /api/decisions/[asset]/narrative`, running with `runtime='nodejs'` and `dynamic='force-dynamic'`, matching existing `app/api/*` route conventions. The request MUST carry a `market: 'crypto' | 'acciones'` query parameter; a missing or invalid `market` value MUST be rejected with a 400 before any further validation. The asset symbol MUST be taken from the route param and validated against the pattern for the declared `market` (`^[A-Z0-9]{2,20}USDT$` for `crypto`, `^[A-Z]{1,5}(\.[A-Z])?$` for `acciones`) before any model call — no enumerated allowlist gates it. The decision lookup MUST read from that market's cache entry only (`cycleCache.getForAsset(market, asset)`), never falling back to or mixing with another market's cache. The response body MUST be a streamed text response. The only input passed to the model MUST be the asset's current `Decision.trace` (evidences, rule IDs, argument labels, thesis scores) — structured symbolic/numeric data, never free text. `ANTHROPIC_API_KEY` MUST be read server-side only and MUST NOT reach the client bundle.
(Previously: validated the asset symbol against a single crypto-only regex with no `market` parameter, and read from the single global cache entry — both assumed exactly one market existed.)

#### Scenario: Valid crypto asset streams narrative
- GIVEN BTCUSDT has an active BUY decision under `market: 'crypto'`
- WHEN `GET /api/decisions/BTCUSDT/narrative?market=crypto` is called
- THEN the response MUST stream text derived from BTCUSDT's current trace

#### Scenario: Valid acciones asset streams narrative
- GIVEN AAPL has an active decision under `market: 'acciones'`
- WHEN `GET /api/decisions/AAPL/narrative?market=acciones` is called
- THEN the response MUST stream text derived from AAPL's current trace

#### Scenario: Missing market parameter rejected
- GIVEN no `market` query parameter is supplied
- WHEN `GET /api/decisions/AAPL/narrative` is called
- THEN the response MUST be a 400, not a narrative

#### Scenario: Malformed symbol rejected, per declared market
- GIVEN "DOGE-USDT" fails the crypto format regex
- WHEN `GET /api/decisions/DOGE-USDT/narrative?market=crypto` is called
- THEN the response MUST be a 400 with error code `BAD_ASSET`, not a narrative

#### Scenario: Well-formed but unknown symbol yields no-decision, not a format error
- GIVEN "DOGEUSDT" is well-formed for `market: 'crypto'` (passes the format regex) but has no current decision, because n8n has never pushed it
- WHEN `GET /api/decisions/DOGEUSDT/narrative?market=crypto` is called
- THEN the response MUST NOT be the same error family as a malformed symbol (400 `BAD_ASSET`)
- AND MUST instead indicate no decision exists for that asset

#### Scenario: Symbol lookup is scoped to its declared market's cache only
- GIVEN a cached crypto decision exists for symbol "AAPL"-shaped input is impossible for crypto (format mismatch), but a cached acciones decision exists for "AAPL"
- WHEN `GET /api/decisions/AAPL/narrative?market=crypto` is called
- THEN the response MUST NOT return the acciones decision — the crypto-market lookup MUST behave as if no decision exists, since "AAPL" is not a well-formed crypto symbol in the first place
