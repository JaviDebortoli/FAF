# Delta for semantic-ingestion (Layer 1)

## ADDED Requirements

### Requirement: Market-data fetch contract
The system MUST fetch the last 50 OHLCV candles per configured asset from Binance's public klines endpoint without an API key, per proposal Scope/D4 and PRD §"Requerimientos de Implementación" (Automatización).

#### Scenario: Successful fetch
- GIVEN a configured crypto asset symbol
- WHEN a cycle fetch runs
- THEN the system MUST retrieve at least 50 candles with OHLCV fields (open, high, low, close, volume)

#### Scenario: Failed or delayed fetch
- GIVEN the Binance endpoint fails or times out
- WHEN a cycle fetch is attempted
- THEN the system MUST emit nothing for that cycle (no stale carry-forward)
- AND MUST NOT surface this as an error state (non-monotonic retraction per FAF §2.1, proposal Edge Cases)

#### Scenario: Cold start
- GIVEN fewer than 50 candles are returned
- WHEN the ingestion cycle completes
- THEN the system MUST mark the cycle as insufficient history so downstream layers emit "no evidence", not a neutral/zero label (proposal Edge Cases)

### Requirement: n8n scheduler-only role (D2)
n8n MUST act only as a Schedule Trigger (1-5 min) that performs a raw HTTP fetch and POSTs unmodified data to the ingestion route. n8n MUST NOT perform RDF-ification, per PRD deviation D2 and openspec/config.yaml `rules.proposal` (RDF modeling stays under Strict TDD in TypeScript).

#### Scenario: n8n forwards raw data
- GIVEN the Schedule Trigger fires
- WHEN n8n calls the market-data source
- THEN n8n MUST POST raw OHLCV JSON to the Next.js ingestion route
- AND MUST NOT construct any RDF triples

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

### Requirement: n8n multi-asset fan-in via Merge node

The scheduled cycle MUST deliver every successfully-fetched asset in one `/api/cycle` payload. Multi-branch fan-in from the per-asset branches MUST converge through an `n8n-nodes-base.merge` node (Append mode, `numberInputs` equal to the branch count) before the payload-building Code node. A direct multi-source fan-in into a single Code-node input MUST NOT be used — n8n resolves the bare `items` global to branch index 0 only, silently dropping every other branch.

#### Scenario: Aggregate node has exactly one Merge-typed upstream connection

- GIVEN `n8n/faf-workflow.json`'s `connections` object
- WHEN inspecting all connections targeting `Aggregate (build /api/cycle payload)` main input index 0
- THEN exactly one node connects to that input
- AND that node's `type` is `n8n-nodes-base.merge`

#### Scenario: Merge node is configured Append with one input per asset branch

- GIVEN the Merge node in `n8n/faf-workflow.json`
- WHEN inspecting its `parameters`
- THEN `mode` is `"append"` and `numberInputs` equals 3
- AND each `Set Symbol - *` node connects to a distinct Merge input index (0, 1, 2)

#### Scenario: [MANUAL-VERIFICATION-ONLY] Live cycle delivers all configured assets

- GIVEN the corrected workflow is imported and run in the user's n8n instance
- WHEN a full cycle executes with all 3 assets reachable
- THEN the `POST /api/cycle` payload's `assets` array contains all 3 configured symbols (BTCUSDT, ETHUSDT, SOLUSDT)
- (Not automatable in this repo — no live n8n execution harness exists)

### Requirement: n8n partial-fetch resilience

A single asset's fetch failure MUST NOT abort delivery of the other successfully-fetched assets for that cycle. Each `Fetch Klines - *` node MUST route failures to a dedicated error output rather than the main/success path, so downstream Merge/Aggregate can complete with whatever subset succeeded — mirroring `runCycle`'s existing "skip a zero-candle asset, don't error" semantics (see "Failed or delayed fetch" scenario above).

#### Scenario: All fetch nodes route errors off the main path

- GIVEN `n8n/faf-workflow.json`
- WHEN inspecting each `Fetch Klines - *` node's configuration
- THEN all 3 nodes set their error-handling field to continue via a dedicated error output (`onError: "continueErrorOutput"`), not the default stop-workflow behavior

#### Scenario: Success wiring is unchanged by error routing

- GIVEN `n8n/faf-workflow.json`'s `connections` object
- WHEN inspecting each `Fetch Klines - *` node's main/success output
- THEN it connects only to its corresponding `Set Symbol - *` node, confirming the error path is separate from the success path

#### Scenario: [MANUAL-VERIFICATION-ONLY] Live cycle survives a single-asset fetch failure

- GIVEN the corrected workflow is imported and one asset's fetch is simulated to fail (e.g. an induced timeout or temporarily invalid symbol)
- WHEN a cycle executes
- THEN the `POST /api/cycle` payload still contains the remaining successfully-fetched assets
- AND the execution does not abort
- (Not automatable in this repo — no live n8n execution harness exists)

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
