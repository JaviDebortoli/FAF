# Delta for semantic-ingestion — n8n Fetch Klines Item-Count Fix

## MODIFIED Requirements

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
