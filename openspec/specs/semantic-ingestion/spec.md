# semantic-ingestion Specification

## ADDED Requirements (from dynamic-asset-count)

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

### Requirement: OHLCV to RDF price-event mapping
The system MUST map each candle to a `faf:PriceEvent` RDF resource carrying `faf:open`, `faf:high`, `faf:low`, `faf:close`, `faf:volume`, `faf:asset`, and `faf:timestamp`, per paper §3.2 and the `faf:` ontology example.

#### Scenario: Candle mapped to RDF
- GIVEN a fetched candle for asset X at time t
- WHEN the mapping runs
- THEN it MUST produce one `faf:PriceEvent` triple set with all five OHLCV properties, `faf:asset = X`, and `faf:timestamp = t`

### Requirement: Indicator value RDF mapping
The system MUST represent each computed indicator reading as a `faf:IndicatorValue` resource with `faf:indicator`, `faf:asset`, `faf:timestamp`, and the indicator-specific property: `faf:rsiValue` (0-100 scalar), `faf:macdHistogram`, `faf:sma20`/`faf:sma50`, or `faf:bollingerUpper`/`faf:bollingerLower`, per paper §3.2 (ontology description and worked RSI example).

#### Scenario: RSI value mapped to RDF
- GIVEN a computed RSI of 15.0 for asset X at time t
- WHEN the mapping runs
- THEN it MUST produce a `faf:IndicatorValue` with `faf:indicator faf:RSI`, `faf:rsiValue "15.0"^^xsd:decimal`, `faf:asset faf:X`, `faf:timestamp t`

#### Scenario: Type disambiguation
- GIVEN a mixed stream of price and indicator events
- WHEN a downstream consumer queries by `rdf:type`
- THEN `faf:PriceEvent` and `faf:IndicatorValue` MUST be distinguishable via `rdf:type` alone (paper §3.2)

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

### Requirement: Push-only asset ingestion

The system MUST accept asset data (candles, symbols) exclusively through `POST /api/cycle`. No other code path — including any GET read path's cache-miss handling — MUST originate asset data by independently fetching Binance or any other market-data source.

#### Scenario: Cache miss does not trigger an independent pull
- GIVEN no cached decision report exists
- WHEN a GET read path (`/api/decisions` or the narrative route) is invoked
- THEN the system MUST NOT call any Binance-fetching function to originate new asset data
- AND MUST rely solely on data previously pushed via `POST /api/cycle`

#### Scenario: POST /api/cycle is the sole ingestion entry point
- GIVEN the full set of routes in the system
- WHEN identifying which routes can introduce new asset/candle data into the cache
- THEN only `POST /api/cycle` MUST do so

### Requirement: n8n symbol-list-driven single-pipeline fan-out

The scheduled cycle MUST deliver every successfully-fetched asset in one `/api/cycle` payload through a constant-node-count pipeline: one Code node MUST emit one item per symbol from a literal array; one parameterized HTTP Request node MUST fetch klines for every item via `={{ $json.symbol }}`; one Set node MUST attach `symbol` and `klines` per item before the unchanged `Aggregate` node. No `n8n-nodes-base.merge` node MUST exist — there are no parallel branches to converge. The HTTP Request (Fetch) node MUST emit exactly one output item per input symbol (one per HTTP call), regardless of whether the fetched response body is itself a JSON array — it MUST NOT split a response array into multiple items per symbol.

(Previously: silent on per-call response-array-splitting behavior — the fetch node's default response handling could split a single symbol's array-shaped response body into one item per array element, multiplying the output item count far beyond the configured symbol count. This is now an explicit MUST.)

#### Scenario: Node count is constant regardless of symbol count

- GIVEN `n8n/faf-workflow.json`'s `nodes` array
- WHEN excluding Schedule Trigger, Aggregate, and POST /api/cycle
- THEN exactly 3 nodes remain (Symbols Code, Fetch HTTP Request, Set), independent of how many symbols the Code node's array holds

#### Scenario: No Merge node exists

- GIVEN `n8n/faf-workflow.json`
- WHEN inspecting every node's `type`
- THEN no node has type `n8n-nodes-base.merge`

#### Scenario: Fetch node is parameterized, not hardcoded

- GIVEN the Fetch HTTP Request node's `parameters.queryParameters`
- WHEN inspecting the `symbol` value
- THEN it is the expression `={{ $json.symbol }}`
- AND no symbol literal (e.g. "BTCUSDT") appears anywhere in that node's parameters

#### Scenario: Fetch Klines emits exactly one item per input symbol, never one item per response array element

- GIVEN `n8n/faf-workflow.json`'s `Fetch Klines` node
- WHEN inspecting `parameters.options.response.response.fullResponse`
- THEN the value is `true`
- AND this flag deterministically forces the node to emit exactly one output item per HTTP call, short-circuiting any splitting of an array-shaped response body into multiple items

#### Scenario: [MANUAL-VERIFICATION-ONLY] Live cycle emits one item per symbol and completes ingestion

- GIVEN the fixed workflow is imported and executed once against the user's live n8n instance
- WHEN a full cycle runs with N configured symbols
- THEN `Fetch Klines`'s output item count equals exactly N (the `Symbols` node's input item count), never N times the candle count
- AND the resulting `POST /api/cycle` call returns 200
- AND the deployed app renders N asset cards
- (Not automatable — no live n8n execution harness exists. If this scenario is not explicitly confirmed by the user before archive, `sdd-verify`/`sdd-archive` MUST record this change as **FUNCTIONALLY UNVERIFIED** — a distinct tier from a routine PASS/PENDING — per this project's manual-verification-gate rule, adopted after this exact failure mode reached production twice unconfirmed.)

#### Scenario: Symbol-list-to-allowlist duplication check is retired

- GIVEN `dynamic-asset-count` removes `ASSET_ALLOWLIST` as an enumerated-membership concept from `src/market/assets.ts`
- WHEN this requirement's original "Symbol list matches the current asset allowlist" scenario (from `n8n-dynamic-asset-list`) is re-evaluated
- THEN that scenario is vacuous — there is no allowlist left to compare the Code node's array against
- AND the Symbols Code node's literal array remains the sole definition of which symbols n8n fetches per cycle, with no source-code list to keep in sync
- AND the Code node's `notes` documenting the (now-nonexistent) duplication MUST be updated or removed as part of this change

#### Scenario: Topology is strictly linear

- GIVEN `n8n/faf-workflow.json`'s `connections` object
- WHEN tracing Schedule Trigger to POST /api/cycle
- THEN the path is Schedule Trigger → Symbols → Fetch → Set → Aggregate → POST, with no fan-in node

#### Scenario: Batching is a no-op at N=3

- GIVEN the Fetch node's Batching option
- WHEN inspecting Items-per-Batch and Batch-Interval
- THEN the values do not throttle a 3-item run (batch size ≥ 3, or interval ≈ 0ms)

#### Scenario: [MANUAL-VERIFICATION-ONLY] Live cycle delivers all configured assets

- GIVEN the refactored workflow is imported and run in the user's n8n instance
- WHEN a full cycle executes with all 3 assets reachable
- THEN the POST /api/cycle payload's `assets` array contains all 3 symbols
- (Not automatable — no live n8n execution harness exists)

### Requirement: n8n partial-fetch resilience

A single asset's fetch failure MUST NOT abort delivery of the other successfully-fetched assets for that cycle. The single multi-item `Fetch Klines` HTTP Request node MUST route per-item failures to a dedicated error output rather than the main/success path — n8n isolates failures at the item level even on one shared node — so the downstream Set/Aggregate steps complete with whatever subset of items succeeded, mirroring `runCycle`'s existing "skip a zero-candle asset, don't error" semantics.
(Previously: resilience was asserted via 3 separate `onError` fields on 3 separate `Fetch Klines - {SYMBOL}` nodes; now asserted via per-item error isolation on one multi-item `Fetch Klines` node.)

#### Scenario: Fetch node routes errors off the main path

- GIVEN `n8n/faf-workflow.json`
- WHEN inspecting the single Fetch Klines node's configuration
- THEN it sets `onError: "continueErrorOutput"`, not the default stop-workflow behavior

#### Scenario: Success wiring is unchanged by error routing

- GIVEN `n8n/faf-workflow.json`'s `connections` object
- WHEN inspecting the Fetch Klines node's main/success output
- THEN it connects only to the Set node, confirming the error path is separate from the success path

#### Scenario: [MANUAL-VERIFICATION-ONLY] Live cycle survives a single-asset fetch failure

- GIVEN one item's fetch is simulated to fail (e.g. an invalid symbol) among the 3 items the single Fetch node processes
- WHEN a cycle executes
- THEN the POST /api/cycle payload still contains the remaining successfully-fetched assets
- AND the execution does not abort
- (Not automatable — no live n8n execution harness exists)

#### Scenario: [MANUAL-VERIFICATION-ONLY] pairedItem metadata does not corrupt symbol/klines pairing

- GIVEN the same induced single-item failure as above
- WHEN Aggregate builds the payload from the surviving items
- THEN each surviving item's klines pair with its correct symbol (no cross-item `pairedItem` bleed, per n8n-io/n8n#30050)
- (Not automatable — no live n8n execution harness exists)

### Requirement: n8n shared-secret credential handling

The shared-secret credential used to authenticate to `/api/cycle` MUST NOT appear as a literal value or as an instance-environment-variable expression (`$env.*`) in the exported/committed workflow JSON. It MUST be referenced only via an n8n credential (by name/type), since credentials are excluded from workflow JSON export and expression-based `$env` access is unreachable on this deployment's plan tier (n8n Cloud Starter).

#### Scenario: POST /api/cycle references a named credential, not an $env expression

- GIVEN `n8n/faf-workflow.json`'s `"POST /api/cycle"` node
- WHEN inspecting its `parameters.headerParameters` and credential/authentication fields
- THEN no header parameter value contains the literal substring `$env.FAF_CYCLE_SHARED_SECRET`
- AND the node's authentication configuration references a named credential (e.g. a Header Auth credential type) instead

#### Scenario: No secret literal or $env expression exists anywhere in the file

- GIVEN `n8n/faf-workflow.json` as a whole
- WHEN searching all string values in the file
- THEN no literal secret value and no `$env.FAF_CYCLE_SHARED_SECRET` expression is present anywhere in the JSON

#### Scenario: [MANUAL-VERIFICATION-ONLY] Credential resolves correctly outside JSON export

- GIVEN the user has created the Header Auth credential in their n8n instance and attached it to `POST /api/cycle`
- WHEN a cycle executes
- THEN the request to `/api/cycle` succeeds with a 200 response (secret validated server-side)
- (Not automatable in this repo — no live n8n execution harness exists)

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
