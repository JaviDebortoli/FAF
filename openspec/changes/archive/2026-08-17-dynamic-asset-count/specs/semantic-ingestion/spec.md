# Delta for semantic-ingestion (Layer 1) — Dynamic Asset Count

## ADDED Requirements

### Requirement: POST /api/cycle symbol validation contract

`POST /api/cycle` MUST authenticate every request via the existing `x-faf-shared-secret` header (unchanged trust boundary). Each `symbol` in the payload MUST be validated against the format regex `^[A-Z0-9]{2,20}USDT$`, independent of any enumerated list. The payload MUST be rejected if it contains more than `MAX_ASSETS = 25` symbols — a standalone cap decoupled from any list length. No enumerated-membership concept (`ASSET_ALLOWLIST` / `AllowedAsset` / `isAllowedAsset`) MUST gate symbol acceptance; these are removed.

#### Scenario: Well-formed, previously-unseen symbol accepted
- GIVEN a request with a valid shared secret and symbol "ADAUSDT", never named anywhere in app source code
- WHEN `POST /api/cycle` is called
- THEN the symbol MUST be accepted — never rejected for being absent from a list

#### Scenario: Malformed symbol rejected
- GIVEN a request with a valid shared secret and symbol "eth-usdt" (fails the format regex)
- WHEN `POST /api/cycle` is called
- THEN the response MUST reject that symbol with a 400

#### Scenario: Payload exceeding MAX_ASSETS rejected
- GIVEN a request with a valid shared secret and 26 well-formed symbols
- WHEN `POST /api/cycle` is called
- THEN the response MUST be rejected for exceeding `MAX_ASSETS = 25`, independent of symbol format validity

#### Scenario: Missing or invalid shared secret still rejected
- GIVEN a request without a valid `x-faf-shared-secret` header
- WHEN `POST /api/cycle` is called with any symbols
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

## MODIFIED Requirements

### Requirement: n8n symbol-list-driven single-pipeline fan-out

The scheduled cycle MUST deliver every successfully-fetched asset in one `/api/cycle` payload through a constant-node-count pipeline: one Code node MUST emit one item per symbol from a literal array; one parameterized HTTP Request node MUST fetch klines for every item via `={{ $json.symbol }}`; one Set node MUST attach `symbol` and `klines` per item before the unchanged `Aggregate` node. No `n8n-nodes-base.merge` node MUST exist — there are no parallel branches to converge.
(Previously: unchanged requirement text; only its "Symbol list matches the current asset allowlist" scenario is replaced below, because `ASSET_ALLOWLIST` no longer exists as a concept after `dynamic-asset-count`. Cross-change note: this requirement was ADDED by the archived `n8n-dynamic-asset-list` change; this delta modifies only that requirement's allowlist-comparison scenario, not its topology/resilience guarantees, which are a distinct concern.)

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
- WHEN a full cycle executes with all reachable assets
- THEN the POST /api/cycle payload's `assets` array contains all of them
- (Not automatable — no live n8n execution harness exists)
