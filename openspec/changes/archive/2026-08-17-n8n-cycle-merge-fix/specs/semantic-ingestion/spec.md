# Delta for semantic-ingestion (Layer 1) — n8n Cycle Merge Fix

## ADDED Requirements

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
