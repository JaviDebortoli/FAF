# Proposal: n8n Dynamic Asset List (single-pipeline refactor)

## Intent

`n8n/faf-workflow.json` hardcodes one branch per asset: adding an asset costs **+2 nodes and a Merge `numberInputs` bump** — unbounded growth in a file with no automated test harness. This refactor makes the node count **constant regardless of asset count** (one Code node emits N items, one parameterized fetch, one Set). As a side effect it deletes the Merge node and therefore the entire "parallel branches silently fan into one input and drop data" bug class that `n8n-cycle-merge-fix` had to patch — there are no parallel branches left to converge.

Purely architectural. Behavior end-to-end must be **functionally identical** for today's 3 symbols; the justification is future scalability, per the user: *"Si bien para el MVP se consideran solo 3 activos, este cambio se justifica desde una posible escalabilidad futura."*

## Scope

### In Scope
- `n8n/faf-workflow.json` **only**. New Code node holds a literal `['BTCUSDT','ETHUSDT','SOLUSDT']` and returns one item per symbol.
- One `Fetch Klines` HTTP Request node: `symbol` query param becomes `={{ $json.symbol }}`; `onError: "continueErrorOutput"` preserved; **Batching** option (Items per Batch / Batch Interval) configured now, since future-proofing is the point of the change.
- One parameterized Set node attaching `symbol` + `klines` per item (no per-symbol hardcoding).
- `Aggregate` Code node and `POST /api/cycle` node (credential auth, placeholder URL) preserved **byte-for-byte**; `Merge Assets` and the 3×2 hardcoded nodes removed.

### Out of Scope
- `src/market/assets.ts` (`ASSET_ALLOWLIST`) and `app/api/cycle/route.ts` (`MAX_ASSETS`, `parseCyclePayload`). Per the user: *"De momento mantenemos la decisión de 3 activos. Si en el futuro se incluyen más, analizaremos qué cambios hacer para ello."*
- Any mechanism syncing the n8n symbol list with `src/market/assets.ts` (new `GET` endpoint or otherwise) — explicitly deferred; the literal duplicate is an accepted, stated decision, not a default.
- All app/TypeScript code and tests.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `semantic-ingestion`: REPLACE `n8n multi-asset fan-in via Merge node` with a single-pipeline requirement (one item per asset through one fetch node; **no** Merge node; no per-asset node duplication). MODIFY `n8n partial-fetch resilience` so its scenarios assert per-item error isolation on the single fetch node instead of 3 per-branch `onError` fields. `n8n shared-secret credential handling` is unchanged and must stay satisfied.

## Approach

Approach 1 from exploration, confirmed against n8n mechanics rather than assumed: per-item iteration is n8n's default; a node with `onError: continueErrorOutput` catches failures **per item** and continues (n8n's own node-builder error-handling pattern, corroborated by `n8n-io/n8n#30050`), so one node over N items preserves the exact resilience property 3 separate `onError` fields achieved. Structural JSON edit only — no new dependency, no L1–L4 change.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `n8n/faf-workflow.json` | Modified | −6 nodes (3 fetch + 3 set) −1 Merge, +1 Code (symbols), +1 fetch, +1 Set |
| `openspec/specs/semantic-ingestion/spec.md` | Modified | Delta replacing/modifying two n8n requirements |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Regression of the just-fixed properties** (partial-fetch resilience, credential-based auth, no `$env`, no secret in JSON, error path separate from success path). Highest-priority risk in this change. | Med | `sdd-design` and `sdd-verify` MUST **re-confirm each property against the new node shape**, not assume it carries over. Every `n8n-cycle-merge-fix` success criterion is re-asserted here. |
| `pairedItem` metadata edge case (`n8n#30050`) affecting downstream item traceability | Low | `Aggregate` reads `item.json.symbol/klines` directly with no `$('Node').item` back-reference, so it should be clear of the bug class — but this is an explicit live-test item (same discipline as merge-fix M5), not an assumption |
| No automated harness can validate n8n JSON | High (known) | Structural checks + a named manual live-test checklist (below) |
| Symbol list duplicated between the Code node and `src/market/assets.ts` drifts | Low | Fails loud via `isAllowedAsset()` 400s, not silently; a node `notes` field must state the duplication and point at `src/market/assets.ts` |
| Batching parameters misconfigured, throttling today's 3-symbol cycle | Low | Values must be a no-op at N=3 (batch size ≥ 3 or interval ~0) and documented in `notes` |

## Rollback Plan

`git checkout -- n8n/faf-workflow.json` (single-file revert), then re-import into n8n. No app code, data, or schema touched. The existing `FAF Cycle Shared Secret` Header Auth credential and the user's real URL are unaffected by either direction of the change.

## Dependencies

- User must re-import the refactored workflow into their n8n instance (2.34.6) and re-apply the two manual steps already documented in the `POST /api/cycle` node notes (real URL, credential selection).
- No n8n version floor beyond what the current file already requires.

## Success Criteria

- [ ] `n8n/faf-workflow.json` is valid JSON; every `connections` entry references an existing node.
- [ ] Exactly one `httpRequest` node fetches klines; its `symbol` query value is `={{ $json.symbol }}`; no symbol literal appears outside the Code node's list.
- [ ] No `n8n-nodes-base.merge` node remains; the pipeline is linear: Schedule → Symbols(Code) → Fetch → Set → Aggregate → POST.
- [ ] Node count is independent of asset count (adding a symbol = editing one array literal, zero node changes).
- [ ] The fetch node retains `onError: "continueErrorOutput"` with its error output separate from the success path.
- [ ] `Aggregate`'s `jsCode` and the `POST /api/cycle` node (URL placeholder, `authentication`, `credentials`, headers, body) are byte-identical to the pre-change file.
- [ ] HTTP Request Batching option is present and configured to be a no-op at N=3.
- [ ] **Manual live-test checklist (M-series, no automated harness exists)**: M1 full run delivers all 3 assets to `/api/cycle`; M2 one symbol deliberately broken (invalid ticker) — the other 2 still reach `/api/cycle` and the execution does not abort; M3 `Aggregate` output shows correct symbol↔klines pairing under M2 conditions (`pairedItem` sanity check); M4 `POST /api/cycle` returns 200 with the credential attached.
