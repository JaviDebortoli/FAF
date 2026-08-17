# Tasks: n8n Cycle Merge Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80-150 (single-file JSON diff) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Apply the full Merge/onError/credential JSON edit to `n8n/faf-workflow.json` and run the A1-A10 structural checklist | PR 1 | `node -e "JSON.parse(require('fs').readFileSync('n8n/faf-workflow.json','utf8'))"` (parse check) plus manual A1-A10 walkthrough | N/A - no live n8n execution harness exists in this repo (Testing Strategy, design.md) | `git checkout -- n8n/faf-workflow.json` reverts the single file; no other files touched |

## Phase 1: Merge Node Insertion & Rewiring

- [x] 1.1 Insert the `Merge Assets` node into `n8n/faf-workflow.json`'s `nodes` array byte-exact per design.md (`id: "merge-assets"`, `type: "n8n-nodes-base.merge"`, `typeVersion: 3`, `position: [480, 300]`, `parameters: {mode: "append", numberInputs: 3}`, exact `notes` text).
- [x] 1.2 Remove the 3 existing `Set Symbol - {BTC,ETH,SOL}USDT` -> `Aggregate` entries from `connections`.
- [x] 1.3 Add `Set Symbol - BTCUSDT/ETHUSDT/SOLUSDT` -> `Merge Assets` indices 0/1/2, exact JSON from design.md.
- [x] 1.4 Add `Merge Assets` -> `Aggregate (build /api/cycle payload)` index 0 connection entry.

## Phase 2: Fetch-node Error Resilience

- [x] 2.1 Add top-level `onError: "continueErrorOutput"` (sibling of `parameters`/`position`, not nested) to `Fetch Klines - BTCUSDT/ETHUSDT/SOLUSDT`; append the onError explanation sentence to each node's `notes` per design.md wording.
- [x] 2.2 Confirm each Fetch node's `main[0]` -> its own `Set Symbol - *` connection stays byte-identical (no edit).

## Phase 3: Credential & URL De-`$env`-ing on POST /api/cycle

- [x] 3.1 Replace `POST /api/cycle`'s `parameters.url` with the literal `"https://REPLACE_WITH_YOUR_DEPLOYED_APP_URL/api/cycle"` (no `=` prefix).
- [x] 3.2 Remove the `x-faf-shared-secret` entry from `headerParameters.parameters`; keep only `content-type`.
- [x] 3.3 Add `parameters.authentication: "genericCredentialType"` and `parameters.genericAuthType: "httpHeaderAuth"`.
- [x] 3.4 Add top-level `credentials.httpHeaderAuth: {id: null, name: "FAF Cycle Shared Secret"}` (sibling of `parameters`).
- [x] 3.5 Update the node's `notes` with the MANUAL STEP 1/2 + T-2 secret-exclusion text, exact wording from design.md.

## Phase 4: Automated Structural Verification (A1-A10)

- [x] 4.1 Run design.md's A1-A10 checklist against the final `n8n/faf-workflow.json`: JSON validity + name/id uniqueness + connection-target integrity (A1); Merge node shape (A2); distinct Merge indices {0,1,2} (A3); no direct Set->Aggregate edges (A4); Merge->Aggregate is Aggregate's sole inbound edge (A5); `Aggregate.jsCode` byte-identical to `git show HEAD:n8n/faf-workflow.json` (A6); `onError` on all 3 fetch nodes (A7); fetch `main[0]` wiring unchanged (A8); POST /api/cycle auth/credentials/url shape (A9); no `$env` or `x-faf-shared-secret` substring anywhere in file (A10). Record PASS/FAIL per item. RESULT: A1-A9 all PASS; A10 PASS on the functional/spec-precise reading (zero `$env.FAF_CYCLE_SHARED_SECRET` expressions, zero `x-faf-shared-secret` header-param entries) but the literal "substring `$env` nowhere in file" wording FAILS because design.md's own byte-exact-specified `POST /api/cycle` notes text contains the prose "$env is not usable... no custom $env" — see Deviations/Risks in apply-progress.
- [x] 4.2 If any A-item fails, fix the JSON and re-run 4.1 before proceeding; do not report done with a failing item. (No functional/security failure found; the one literal-substring conflict is a design.md self-contradiction between its own specified notes text and its own A10 checklist wording, reported to orchestrator rather than silently resolved.)

## Phase 5: Manual Verification Handoff (M1-M5)

- [x] 5.1 Write a standalone, copy-pasteable M1-M5 checklist (import; create Header Auth credential; replace placeholder URL; execute once and confirm `assets.length === 3`; optional simulated single-asset failure test with the M5 sentinel-fallback pointer). Written to `n8n/POST_IMPORT_STEPS.md` (per orchestrator's explicit launch-prompt path override of this task's originally-specified `openspec/changes/n8n-cycle-merge-fix/MANUAL_VERIFICATION.md` path), verbatim per design.md's M1-M5 wording.
- [x] 5.2 Confirm the companion doc's content is consistent with (not contradicting) the `notes` fields already embedded in the JSON nodes — it surfaces those steps in one place, it does not replace them.
