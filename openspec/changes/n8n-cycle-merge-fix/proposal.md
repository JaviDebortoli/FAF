# Proposal: n8n Cycle Merge Fix

## Intent

`n8n/faf-workflow.json` fans out to 3 assets (BTCUSDT/ETHUSDT/SOLUSDT) but fans them back into the **same** input index of the `Aggregate (build /api/cycle payload)` Code node with **no Merge node**. n8n resolves the bare `items` global to `branchIndex 0`, so every real cycle silently POSTs **1 of 3 assets**. `parseCyclePayload` accepts `assets.length` 1–3, so nothing rejects it — the loss is invisible.

Impact: the deployed automation only ever evaluates one asset per cycle. The thesis claim rests on the FAF pipeline evaluating real multi-asset market data, so this is correctness-affecting, not cosmetic.

Two related defects, found while refining this same file with the user, are folded into this change (scope expanded by explicit user decision, not scope creep):

1. **`$env` cannot resolve on the user's n8n Cloud Starter plan.** `POST /api/cycle`'s `{{ $env.FAF_APP_BASE_URL }}` and `{{ $env.FAF_CYCLE_SHARED_SECRET }}` expressions read instance-level environment variables — a self-hosted-only configuration surface. n8n Cloud never exposes a UI for custom `$env` values; the Cloud-native replacement (`$vars`, the Variables/Environments feature) requires a Pro or Enterprise plan, which the user does not have (confirmed: Starter). As written, these expressions can never resolve on this instance, regardless of what the user configures — this is not an unset-variable gap, it's an unreachable configuration surface. This is very likely the real cause of the red `POST /api/cycle` status in the user's screenshot.
2. **No partial-fetch resilience.** None of the 3 `Fetch Klines - *` nodes set an `onError` policy (default: Stop Workflow). If Binance fails/rate-limits for one asset, the entire cycle currently aborts — even the 2 healthy assets never reach `/api/cycle`. This contradicts the app's own documented semantic-ingestion philosophy (`app/api/cycle/route.ts`, `parseCyclePayload`: 1–3 assets accepted; `runCycle`: an asset with zero candles is skipped, not treated as a fatal error — "failed/delayed fetch → emit nothing, no error"). The user asked to define this now rather than defer it.

## Scope

### In Scope
- Insert one `n8n-nodes-base.merge` node (`typeVersion: 3`, `parameters: { mode: "append", numberInputs: 3 }`) into `n8n/faf-workflow.json`.
- Rewire `Set Symbol - {BTC,ETH,SOL}USDT` to Merge inputs 0/1/2; Merge output → `Aggregate` input 0; drop the 3 direct Set→Aggregate connections.
- Replace `POST /api/cycle`'s `{{ $env.FAF_CYCLE_SHARED_SECRET }}` header expression with an n8n **Header Auth credential** (`Name: x-faf-shared-secret`, `Value: <the real secret>`) attached to the node's `authentication` parameter — credentials are a core n8n feature on every plan (unlike Variables), are encrypted at rest, and are **excluded from workflow JSON export**, so the real secret never lands in this git repo. The exported JSON will reference the credential by name/type only, not by value.
- Replace `{{ $env.FAF_APP_BASE_URL }}` with a literal placeholder string the user edits after import (e.g. `https://REPLACE_WITH_YOUR_DEPLOYED_APP_URL/api/cycle`) — not sensitive, no Variables feature needed.
- Set `onError: "continueErrorOutput"` on each of the 3 `Fetch Klines - *` nodes, so a single asset's fetch failure routes to that node's dedicated error output (not the main/success output the workflow already uses) instead of aborting the whole execution. The corresponding `Set Symbol - *` branch then legitimately produces 0 items for that cycle, and Merge (Append mode) still completes with the other 1–2 assets' items concatenated, matching the app's own "skip, don't fail" semantics.
- Keep the file a valid n8n export (node ids/names/positions, `connections` integrity).

### Out of Scope
- Any TypeScript/app code (`app/api/cycle/route.ts`, `src/**`) — the payload contract (`parseCyclePayload` accepts 1–3 assets) already supports a partial 1–2 asset payload without changes.
- The `Aggregate` node's `jsCode` — with one upstream connection, `items` already sees all merged items.
- Creating the actual Header Auth credential value and pasting the real secret/URL into the user's n8n instance — that's a manual, post-implementation step for the user (the workflow JSON only ever references the credential by name/type).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `semantic-ingestion`: extend the "n8n scheduler-only role (D2)" area with three requirements: (1) the scheduled cycle MUST deliver every successfully-fetched asset in one payload — multi-branch fan-in MUST converge through a Merge node before the payload builder; (2) a single asset's fetch failure MUST NOT abort the other assets' delivery for that cycle; (3) the shared secret MUST never be embedded in the exported workflow JSON (credential-based, not expression-based). No RDF/algebra semantics change, so no cross-reference against the FAF papers is affected.

## Approach

Structural JSON edit plus a credential/error-handling policy change — no new dependency, no TypeScript touched. Merge shape matches n8n's documented V3 `append` behavior (`returnData.push.apply` per input, flat concat), verified against n8n source in exploration. Credential and `onError` mechanisms verified against n8n's own docs (Header Auth generic credential, `On Error: Continue using error output` node setting). No behavior change to L1–L4.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `n8n/faf-workflow.json` | Modified | +1 Merge node, rewired connections |
| `openspec/specs/semantic-ingestion/spec.md` | Modified | Delta: all-assets-per-cycle requirement |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Wrong Merge export shape | Low | Shape verified against n8n `nodes-base/nodes/Merge/v3` source |
| No CI can validate n8n JSON | High (known) | JSON structural check + mandatory manual re-run |
| `onError: continueErrorOutput` doesn't unblock Merge as expected (unverified end-to-end — docs confirm the setting and Merge's "waits for execution" wording, but not the exact zero-item interaction) | Med | Flag explicitly for `sdd-design`/`sdd-verify` to confirm via live docs or ask the user to empirically test a simulated single-asset failure post-fix |
| User pastes the real secret into the wrong credential field, or forgets to replace the placeholder URL | Low | Success Criteria names both as explicit manual post-import steps, not assumed |
| Confirmed n8n version (2.34.6) has undocumented behavior differences from the 1.49.0-era Merge V3 docs used to verify the shape | Low | Same `type`/`mode`/`numberInputs` fields; 2.34.6 is far newer than 1.49.0 so the feature is expected to be stable, but flagged since n8n's 2.x line introduced other unrelated breaking changes (e.g. Code-node `$env` blocking) |

## Rollback Plan

`git checkout -- n8n/faf-workflow.json` (single-file revert), then re-import into n8n. No data, schema, or app-code migration. The Header Auth credential (if already created in the user's n8n instance) is harmless to leave in place even after a rollback.

## Dependencies

- n8n instance ≥ 1.49.0 (introduces Merge V3 `numberInputs`) — confirmed satisfied (user's instance: 2.34.6).
- User must re-import the corrected workflow into their own n8n instance.
- User must manually create a Header Auth credential (`x-faf-shared-secret` = the real `FAF_CYCLE_SHARED_SECRET` value) and attach it to the `POST /api/cycle` node, and must manually replace the placeholder app URL with their real deployed URL — both are named as explicit post-import steps, not automated by this change (n8n Cloud gives no API/CLI path to pre-provision credentials from a git-committed file).

## Success Criteria

- [ ] `n8n/faf-workflow.json` parses as valid JSON and matches n8n's Merge v3 export schema; all `connections` reference existing node names.
- [ ] Exactly one fan-in path: 3 `Set Symbol - *` → Merge (0/1/2) → `Aggregate` (0).
- [ ] `Aggregate`'s `jsCode` is byte-identical to before.
- [ ] `POST /api/cycle`'s shared-secret header uses a named Header Auth credential reference, not an `$env` expression; no real secret value appears anywhere in the committed JSON.
- [ ] `POST /api/cycle`'s URL is a literal, clearly-marked placeholder string, not an `$env` expression.
- [ ] All 3 `Fetch Klines - *` nodes have `onError: "continueErrorOutput"` set.
- [ ] **Manual, user-run verification** (no automated harness exists): user imports the corrected workflow, creates the credential, sets the real URL, runs it, and confirms the `Aggregate` output / POST payload contains all 3 assets. User separately (optional, out of the "done" gate but recommended) simulates a single-asset failure to confirm the other 2 still deliver.
