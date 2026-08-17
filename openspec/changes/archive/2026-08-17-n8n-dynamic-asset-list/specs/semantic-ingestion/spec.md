# Delta for semantic-ingestion (Layer 1) — n8n Dynamic Asset List

## ADDED Requirements

### Requirement: n8n symbol-list-driven single-pipeline fan-out

The scheduled cycle MUST deliver every successfully-fetched asset in one `/api/cycle` payload through a constant-node-count pipeline: one Code node MUST emit one item per symbol from a literal array; one parameterized HTTP Request node MUST fetch klines for every item via `={{ $json.symbol }}`; one Set node MUST attach `symbol` and `klines` per item before the unchanged `Aggregate` node. No `n8n-nodes-base.merge` node MUST exist — there are no parallel branches to converge.

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

#### Scenario: Symbol list matches the current asset allowlist
- GIVEN the Symbols Code node's literal array
- WHEN compared against `src/market/assets.ts`'s `ASSET_ALLOWLIST`
- THEN both contain exactly BTCUSDT, ETHUSDT, SOLUSDT
- AND the Code node's `notes` documents the duplication and points at `src/market/assets.ts`

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: n8n multi-asset fan-in via Merge node

(Reason: The 3 hardcoded parallel fetch branches this Merge-based fan-in converged no longer exist; the single-pipeline refactor eliminates the entire "parallel branches silently drop data without Merge" bug class this requirement guarded against.)
(Migration: Replaced by "n8n symbol-list-driven single-pipeline fan-out" above, which delivers the same outcome — all successfully-fetched assets in one payload — via a single parameterized multi-item node instead of per-branch fan-in through Merge.)
