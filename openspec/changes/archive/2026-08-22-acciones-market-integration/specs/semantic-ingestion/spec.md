# Delta for semantic-ingestion

## MODIFIED Requirements

### Requirement: Market-data fetch contract
The system MUST fetch the last 50 EOD (daily) OHLCV candles per configured asset from a market-specific public data source, keyed by the asset's `market` discriminator: `market: 'crypto'` assets are fetched from Binance's public klines endpoint (`interval=1d`) without an API key; `market: 'acciones'` assets are fetched from Twelve Data's `time_series` endpoint (`interval=1day`) using a provisioned API key. Both sources are called with the same non-incremental "always fetch last 50" pattern, independent of interval.
(Previously: fetched the last 50 OHLCV candles per configured asset from Binance's public klines endpoint only, with interval unspecified at this requirement's level; single-source, crypto-only.)

#### Scenario: Successful fetch, either market
- GIVEN a configured crypto or acciones asset symbol
- WHEN a cycle fetch runs
- THEN the system MUST retrieve at least 50 daily OHLCV candles from that asset's market-specific source

#### Scenario: Failed or delayed fetch, either market
- GIVEN the market-specific endpoint (Binance or Twelve Data) fails or times out
- WHEN a cycle fetch is attempted
- THEN the system MUST emit nothing for that cycle (no stale carry-forward)
- AND MUST NOT surface this as an error state (non-monotonic retraction per FAF §2.1)

#### Scenario: Cold start, either market
- GIVEN fewer than 50 candles are returned
- WHEN the ingestion cycle completes
- THEN the system MUST mark the cycle as insufficient history so downstream layers emit "no evidence"

### Requirement: n8n scheduler-only role (D2)

n8n MUST act only as a Schedule Trigger (6h, shared by both market branches) that performs a raw HTTP fetch per market and POSTs unmodified data to the ingestion route, tagged with that branch's `market` discriminator. n8n MUST NOT perform RDF-ification. Both the crypto branch (Binance, `interval=1d`) and the acciones branch (Twelve Data, `interval=1day`) use `limit=50` EOD candles per fetch — a non-incremental "always fetch the last 50" pattern that is safe regardless of how many genuinely-new daily candles land between two 6h ticks (including zero, on a poll that isn't itself the daily close), because `runCycle` is a pure, idempotent function of its input candles.
(Previously: single crypto-only branch on `interval=1h`, with safety framed around a ~6-candle-per-cycle margin specific to hourly granularity; that framing no longer applies once both branches migrate to daily EOD candles (D1).)

#### Scenario: n8n forwards raw data, tagged by market
- GIVEN the Schedule Trigger fires
- WHEN n8n calls either market's data source
- THEN n8n MUST POST raw OHLCV JSON, tagged with that branch's `market` value, to the Next.js ingestion route
- AND MUST NOT construct any RDF triples

#### Scenario: Schedule Trigger is configured for exactly 6h, shared by both branches
- GIVEN `n8n/faf-workflow.json`'s Schedule Trigger node
- WHEN inspecting `parameters.rule.interval`
- THEN it MUST be `{"field": "hours", "hoursInterval": 6}`
- AND both the crypto and acciones branches MUST fan out from this one trigger

#### Scenario: limit=50 EOD fetch remains valid regardless of interval
- GIVEN `Fetch Klines` (crypto, `interval=1d`) and the Twelve Data fetch (acciones, `interval=1day`) are each configured with `limit=50`
- WHEN a cycle runs every 6h
- THEN each fetch MUST return 50 complete historical daily candles in one call, independent of how many are genuinely new since the prior cycle

### Requirement: POST /api/cycle symbol validation contract

`POST /api/cycle` MUST authenticate every request via the existing `x-faf-shared-secret` header. Each payload MUST carry a `market: 'crypto' | 'acciones'` discriminator. Each `symbol` MUST be validated against the pattern for its declared market: `market: 'crypto'` symbols MUST match `^[A-Z0-9]{2,20}USDT$` (`ASSET_SYMBOL_PATTERN`, unchanged); `market: 'acciones'` symbols MUST match `^[A-Z]{1,5}(\.[A-Z])?$` (US ticker, 1-5 uppercase letters with an optional single-letter share-class suffix, e.g. `AAPL`, `BRK.B`). A payload with a `market` value outside this union MUST be rejected. Each market's payload MUST be independently capped at `MAX_ASSETS = 25` symbols.
(Previously: single global pattern `^[A-Z0-9]{2,20}USDT$`, no `market` field, no per-market validation branch, one shared `MAX_ASSETS` cap with no market partitioning.)

#### Scenario: Well-formed crypto symbol accepted
- GIVEN a request with `market: 'crypto'`, a valid shared secret, and symbol "ADAUSDT"
- WHEN `POST /api/cycle` is called
- THEN the symbol MUST be accepted

#### Scenario: Malformed crypto symbol rejected
- GIVEN a request with `market: 'crypto'` and symbol "eth-usdt"
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Well-formed acciones ticker (1-5 letters) accepted
- GIVEN a request with `market: 'acciones'`, a valid shared secret, and symbol "AAPL"
- WHEN `POST /api/cycle` is called
- THEN the symbol MUST be accepted

#### Scenario: Well-formed acciones share-class ticker accepted
- GIVEN a request with `market: 'acciones'` and symbol "BRK.B"
- WHEN `POST /api/cycle` is called
- THEN the symbol MUST be accepted

#### Scenario: Empty acciones symbol rejected
- GIVEN a request with `market: 'acciones'` and symbol ""
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Lowercase acciones symbol rejected
- GIVEN a request with `market: 'acciones'` and symbol "aapl"
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Acciones symbol exceeding 5 letters rejected
- GIVEN a request with `market: 'acciones'` and symbol "AAAAAA"
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Acciones symbol with digits rejected
- GIVEN a request with `market: 'acciones'` and symbol "AAP1"
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Acciones symbol with a two-letter share-class suffix rejected
- GIVEN a request with `market: 'acciones'` and symbol "BRK.BB"
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Acciones symbol with a dangling dot rejected
- GIVEN a request with `market: 'acciones'` and symbol "BRK."
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Acciones symbol with a digit share-class suffix rejected
- GIVEN a request with `market: 'acciones'` and symbol "BRK.1"
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Payload exceeding MAX_ASSETS rejected, per market
- GIVEN a request with `market: 'acciones'`, a valid shared secret, and 26 well-formed symbols
- WHEN `POST /api/cycle` is called
- THEN the response MUST be rejected for exceeding `MAX_ASSETS = 25`, independent of the crypto branch's own count

#### Scenario: Unknown market value rejected
- GIVEN a request with `market: 'forex'` and otherwise well-formed symbols
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject the request with a 400

#### Scenario: Missing or invalid shared secret still rejected
- GIVEN a request without a valid `x-faf-shared-secret` header
- WHEN `POST /api/cycle` is called with any market and symbols
- THEN the response MUST be 401/403 regardless of symbol format

## ADDED Requirements

### Requirement: Market-keyed presentation cache

`src/cycle/latest.ts` MUST maintain one cache entry per `market` value rather than a single global entry. A `POST /api/cycle` push for one market MUST update only that market's cache entry and MUST NOT overwrite, clear, or otherwise affect any other market's cached entry.

#### Scenario: Acciones push does not affect the crypto cache entry
- GIVEN a cached crypto report exists
- WHEN a `POST /api/cycle` push for `market: 'acciones'` is processed
- THEN the crypto cache entry MUST remain unchanged
- AND a new acciones cache entry MUST exist, independently expiring per its own TTL

#### Scenario: Crypto push does not affect the acciones cache entry
- GIVEN a cached acciones report exists
- WHEN a `POST /api/cycle` push for `market: 'crypto'` is processed
- THEN the acciones cache entry MUST remain unchanged
