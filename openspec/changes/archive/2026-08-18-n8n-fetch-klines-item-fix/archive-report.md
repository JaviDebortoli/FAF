# Archive Report: n8n Fetch Klines Item-Count Fix

**Change**: n8n-fetch-klines-item-fix
**Date**: 2026-08-18
**Status**: ARCHIVED
**Verdict**: PASS (fully verified, including live confirmation)

---

## What Was Fixed

A production incident in the deployed app (https://faf-six.vercel.app): `POST /api/cycle` was failing **every cycle** with `400 "assets" length must be between 1 and 25`.

**Root cause** (verified twice against n8n's `HttpRequestV3.node.ts` GitHub source, and confirmed live by user): The `Fetch Klines` node was using n8n's default `responseFormat: 'autodetect'`, which splits array-shaped response bodies into one item per array element. Binance returns 50 kline rows per symbol, so with 4 configured symbols, the node emitted 200 items instead of 4 — far exceeding `MAX_ASSETS=25` and causing the payload validation to reject the cycle.

**Fix** (single-field JSON change in commit `2701c0c`): Set `parameters.options.response.response.fullResponse = true` on the `Fetch Klines` node. This flag forces n8n to emit exactly one item per HTTP call, regardless of response shape, preserving the full array in `.body` so that `Set Symbol`'s existing `$json.body ?? $json` expression receives the correct 50-row candle array per symbol.

**Scope**:
- `n8n/faf-workflow.json`: Added `response.response.fullResponse: true` nested key; `batching` preserved byte-identical; no other node or connection changed.
- `n8n/POST_IMPORT_STEPS.md`: Rewrote M4 to check source-node item count first (N items for N symbols, not N×50), catching regressions at the root cause, not only at the symptom.

---

## Verification Summary

**Verdict**: PASS — structurally correct AND confirmed live by user

| Metric | Value |
|--------|-------|
| Critical findings | 0 |
| Warnings | 0 |
| Blockers | 0 |
| Automatable structural scenarios | 1/1 COMPLIANT |
| Manual verification scenarios | 1/1 CONFIRMED (live execution verified by user) |
| Overall spec compliance | 1/1 requirement satisfied |

**Verification evidence**:
- **Structural (automatable)**: Read/grep verified the exact dot-path `Fetch Klines.parameters.options.response.response.fullResponse === true`; no other node or field altered; JSON valid and importable; `POST_IMPORT_STEPS.md` rewritten correctly.
- **Live manual verification (CONFIRMED by user)**: User executed the fixed workflow in their live n8n 2.34.6 Cloud instance and pasted the actual `Fetch Klines` output showing exactly 4 items (one per configured symbol: BTCUSDT ~63-64k, ETHUSDT ~1880-1920, two mid-range symbols), each correctly shaped `{body: [50 kline rows], headers, statusCode: 200, statusMessage: "OK"}`. User then confirmed end-to-end app behavior: `Aggregate` completed with 4 assets, `POST /api/cycle` returned 200, and the deployed dashboard rendered 4 asset cards with live data. Quote: "Ya pude verificar el flujo como la plataforma web y todo funciona correctamente" (I was able to verify the flow and the web platform works correctly end-to-end).

**Process rule applied** (Engram id 1544, user-confirmed 2026-08-18): This change has one `[MANUAL-VERIFICATION-ONLY]` scenario. The project now requires that such scenarios be explicitly confirmed by the user before marking the change fully complete. This change exemplifies the rule working correctly — the user provided real `Fetch Klines` execution output (4 items with correct shape) and explicit end-to-end confirmation. This verdict is upgraded from the intermediate "FUNCTIONALLY UNVERIFIED" to **PASS** per this live evidence.

---

## Spec Compliance (Automated + Live)

✅ **Requirement**: n8n symbol-list-driven single-pipeline fan-out (MODIFIED)

**Automatable scenarios**:
- ✅ Node count is constant regardless of symbol count (3 nodes: Symbols, Fetch, Set)
- ✅ No Merge node exists
- ✅ Fetch node is parameterized via `$json.symbol`, not hardcoded
- ✅ Fetch Klines emits exactly one item per input symbol — fullResponse field present at verified path (`parameters.options.response.response.fullResponse === true`)
- ✅ Symbol-list-to-allowlist duplication scenario is vacuous (ASSET_ALLOWLIST removed by dynamic-asset-count)
- ✅ Topology is strictly linear (Schedule Trigger → Symbols → Fetch → Set → Aggregate → POST)
- ✅ Batching is a no-op at N=3 (batchSize: 50, batchInterval: 1000)

**Live manual scenario**:
- ✅ Live cycle emits one item per symbol and completes ingestion — CONFIRMED by user (4 items, correct shape, POST /api/cycle 200, dashboard rendering working)

---

## Residual Manual Verification (All Complete)

Per the newly adopted process rule (Engram 1544), the `[MANUAL-VERIFICATION-ONLY]` scenario in this change **is now CONFIRMED COMPLETE** and does not remain pending post-archive. The user has executed the workflow, verified output shape, and confirmed end-to-end app behavior.

No further live verification steps remain. The fix is production-ready.

---

## Delivery Route

This change was **applied directly to `main` branch** (not via a feature-branch PR), per explicit user decision given production urgency and minimal blast radius:
- Commit: `2701c0c`
- Authored diff: 1 JSON field + doc-file edit
- 400-line review budget risk: **Low** (~5 lines changed)
- Single PR feasible: **Yes**
- Chained PRs needed: **No**
- Urgency: Production cycle was down; fast-track justified

**Status**: Already committed and pushed to main; no pending PR chain.

---

## Artifacts Archived

| File | Status |
|------|--------|
| proposal.md | ✅ Archived |
| exploration.md | ✅ Archived |
| design.md | ✅ Archived |
| tasks.md | — Not created (fast-tracked production fix; no task tracking artifact) |
| verify-report.md | ✅ Archived (verdict PASS, 0 critical, live manual scenario confirmed) |
| specs/semantic-ingestion/spec.md (delta) | ✅ Archived |

---

## Delta Spec Merged into Main Specs

**Domain**: `semantic-ingestion` (Layer 1)

**Action**: MERGED (requirement MODIFIED with additional scenarios)

**Modified requirement in** `openspec/specs/semantic-ingestion/spec.md`:
- **n8n symbol-list-driven single-pipeline fan-out**: Enhanced requirement statement to explicitly mandate one-item-per-call behavior; added new scenario "Fetch Klines emits exactly one item per input symbol, never one item per response array element" with fullResponse field check; upgraded manual scenario to include live confirmation evidence and process-rule note.

**Pre-existing requirements preserved**:
1. Market-data fetch contract
2. n8n scheduler-only role (D2)
3. OHLCV to RDF price-event mapping
4. Indicator value RDF mapping
5. POST /api/cycle symbol validation contract
6. Push-only asset ingestion
7. n8n partial-fetch resilience
8. n8n shared-secret credential handling

---

## Engram Artifact Observation IDs

For traceability, all SDD artifacts related to this change in Engram:

| Artifact | Type | Observation ID |
|----------|------|-----------------|
| sdd/n8n-fetch-klines-item-fix/explore | architecture | 1542 |
| sdd/n8n-fetch-klines-item-fix/proposal | architecture | 1543 |
| sdd/n8n-fetch-klines-item-fix/spec | architecture | 1545 |
| sdd/n8n-fetch-klines-item-fix/design | architecture | 1546 |
| sdd/n8n-fetch-klines-item-fix/archive-report | architecture | (created during archive phase, this artifact) |

---

## Final State

✅ **Task Completion Gate**: No tasks.md artifact (fast-tracked production fix); no pending implementation tasks. Archive proceeds.

✅ **Native Review Receipt Gate**: No review was started for this candidate; proceed under ordinary repository policy.

✅ **Manual Verification Gate**: The one `[MANUAL-VERIFICATION-ONLY]` scenario is CONFIRMED by user (live Fetch Klines output + end-to-end app confirmation). Fully PASS verdict is valid.

✅ **Change folder moved to archive**: `openspec/changes/archive/2026-08-18-n8n-fetch-klines-item-fix/`

✅ **Delta spec merged**: Modified requirement merged into `openspec/specs/semantic-ingestion/spec.md`; pre-existing requirements preserved; spec is now authoritative.

✅ **Archive report written**: Filesystem + Engram `sdd/n8n-fetch-klines-item-fix/archive-report`

---

**SDD Cycle Complete**. Production issue resolved. Change fully verified and archived.

