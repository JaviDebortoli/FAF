# Exploration: n8n-cycle-merge-fix

## Current State

`n8n/faf-workflow.json` ("FAF - Cycle Trigger") fans out from `Schedule Trigger (1-5min)` into 3 parallel branches (`Fetch Klines - {BTC,ETH,SOL}USDT` → `Set Symbol - {BTC,ETH,SOL}USDT`), then all three `Set Symbol - *` nodes connect directly to the **same** `main`/`index:0` input of the single `Aggregate (build /api/cycle payload)` Code node (typeVersion 2, "Run Once for All Items" mode via bare `items.map(...)`). No `n8n-nodes-base.merge` node exists anywhere in the file — confirmed by reading the entire 243-line JSON; the Schedule→3×Fetch fan-out is a harmless 1-to-many split, and Aggregate→POST is a simple 1-to-1, so the 3×Set-Symbol→Aggregate convergence is the **only** fan-in point in the file and the only structural anti-pattern present.

`POST /api/cycle` reads `$env.FAF_APP_BASE_URL` and `$env.FAF_CYCLE_SHARED_SECRET` — both n8n-instance-side env vars, not app-side (`.env.example` documents `FAF_CYCLE_SHARED_SECRET` for the app and `ANTHROPIC_API_KEY`, but never `FAF_APP_BASE_URL`, since that one belongs to n8n's own config). `app/api/cycle/route.ts`'s `parseCyclePayload()` accepts `assets.length` in `1..MAX_ASSETS(3)` — a 1-asset BTCUSDT-only payload (the buggy pre-fix output) would **pass** shape validation, not get rejected. No test/validation harness exists anywhere in the repo for `n8n/faf-workflow.json`; `package.json` scripts (`vitest`, `playwright`) never touch `n8n/`.

## Root Cause (confirmed by the user's full workflow execution, not a manual step-by-step test)

The `Aggregate` Code node's bare `items` global, in n8n's execution model, resolves to `$input.all()` with a default `branchIndex` of 0 when multiple unmerged source nodes connect to the same input index — so only the first-connected branch's item(s) are read; the other two branches' data is silently dropped. This matches the user's screenshot (only BTCUSDT flowed through with real data; ETHUSDT/SOLUSDT did not).

## Confirmed Merge Node Technical Shape

Verified against n8n's own GitHub source (`packages/nodes-base/nodes/Merge/v3/`, fetched via GitHub Contents API — not guessed):

- `versionDescription.ts`: `version: [3, 3.1, 3.2]` — n8n's "V3" Merge implementation, the version that introduced arbitrary `numberInputs` (available from n8n 1.49.0). Legacy V1/V2 only support a fixed 2 inputs, no `numberInputs` parameter.
- `mode` internal values (`actions/mode/index.ts`): `'append'` (UI "Append" — "Output items of each input, one after the other"), `'combine'`, `'combineBySql'`, `'chooseBranch'`.
- `numberInputs` (`helpers/descriptions.ts`, `numberInputsProperty`, referenced by `mode/append.ts`): `name: 'numberInputs'`, `type: 'options'`, `default: 2`, options 2–10, "The node waits for all connected inputs to be executed."
- `mode/append.ts` execute logic confirmed verbatim: `for each inputsData[i]: returnData.push.apply(returnData, inputsData[i]); return [returnData]` — flat concatenation of all connected inputs into one output array.
- Node `inputs` is a dynamic expression tied to `$parameter.numberInputs`, so `numberInputs: 3` produces 3 distinct main input sockets (indices 0/1/2).

**Required new node**:
```json
{
  "id": "merge-assets",
  "name": "Merge Assets",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [480, 300],
  "parameters": { "mode": "append", "numberInputs": 3 }
}
```

**Required connection changes**: `Set Symbol - BTCUSDT`→Merge idx 0, `Set Symbol - ETHUSDT`→Merge idx 1, `Set Symbol - SOLUSDT`→Merge idx 2, and `Merge Assets`→`Aggregate` idx 0 (replacing the 3 direct Set-Symbol→Aggregate connections).

## Aggregate Code Node — No Change Needed

Once Merge is inserted, Aggregate has exactly ONE upstream connection (from Merge's single output) at its single input index 0. n8n's own community forum documents this exact symptom-and-fix pair (thread: "Run Once for All Items Code Node Not Receiving All Items from $input.all()" — root cause: unmerged multi-branch fan-in; resolution: insert a Merge node ahead of the Code node, confirmed working by the reporter). With one upstream connection, bare `items`/`$input.all()` returns all items with no branch ambiguity — `items.map(...)` will correctly see all 3 merged assets. No `jsCode` change required.

## POST /api/cycle Red Failure — Separate Issue, Not a Consequence of the Merge Bug

A 1-asset payload is NOT rejected by `parseCyclePayload` (length 1 is within the allowed 1–3 range). The likelier cause is an n8n-instance-side configuration gap: `FAF_APP_BASE_URL` and/or `FAF_CYCLE_SHARED_SECRET` unset as n8n environment variables, producing either an invalid request URL or a 401/403 from `checkSharedSecret`. Recommend this be verified by the user separately post-fix — it is explicitly OUT of scope for this change's definition of done.

## Approaches Compared

### 1. Insert `n8n-nodes-base.merge` (typeVersion 3, `mode: "append"`, `numberInputs: 3`) — user-approved
- **Pros**: matches n8n's documented pattern exactly; minimal surgical diff (1 new node + rewired connections); no Code-node logic change; independently corroborated by an n8n community thread with the identical symptom/fix.
- **Cons**: none significant.
- **Effort**: Low.

## Recommendation

Proceed as approved: add the Merge node and rewire connections as above; no Aggregate code change; treat `POST /api/cycle`'s red status as a separate env-config check, out of scope.

## Risks

- No automated test harness for n8n workflow JSON in this repo — `sdd-tasks`/`sdd-verify` will need to define "done" as JSON structural correctness (valid n8n export shape, correct node/connection references) plus a documented manual re-run by the user in their n8n instance, not vitest/playwright TDD.
- `POST /api/cycle` may still fail after the merge fix if the env-var gap is real — this must not be mistaken for a regression of this change.
- This is the only fan-in anti-pattern found in the current workflow file; no other instances to fix.

## Ready for Proposal

Yes — the fix's exact technical shape is fully confirmed against n8n source and scope is bounded to a single-file, single-node-insertion change.
