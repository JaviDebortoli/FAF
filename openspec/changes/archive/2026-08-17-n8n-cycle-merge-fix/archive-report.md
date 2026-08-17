# Archive Report: n8n Cycle Merge Fix

**Change**: n8n-cycle-merge-fix
**Date**: 2026-08-17
**Status**: ARCHIVED
**Verdict**: PASS (clean) → safe to close

---

## What Was Fixed

Three structural bugs in `n8n/faf-workflow.json`, all in the same file, all fixed in a single commit (`fcd07ab`):

1. **Merge fan-in bug**: 3 Set-Symbol nodes fan-in directly to Aggregate Code node without a Merge node, causing n8n to silently drop 2 of 3 assets (bare `items` resolves to branch 0 only). **Fix**: Insert `n8n-nodes-base.merge` (Append mode, numberInputs: 3), rewire Set-Symbol-{BTC,ETH,SOL} to Merge inputs 0/1/2, Merge output → Aggregate input 0.

2. **$env unreachable on n8n Cloud Starter**: `{{ $env.FAF_APP_BASE_URL }}` and `{{ $env.FAF_CYCLE_SHARED_SECRET }}` cannot resolve on n8n Cloud Starter (no custom $env vars allowed; only Pro/Enterprise can use Variables). This likely caused the red POST /api/cycle status in the user's screenshot. **Fix**: Replace $env expressions with Header Auth credential (n8n-native, all-plan, encrypted, excluded from JSON export) for shared secret; use literal placeholder string for URL.

3. **No partial-fetch resilience**: None of the 3 Fetch-Klines nodes set `onError`, so one Binance failure aborts the entire cycle (contradicts app's own "skip failed asset, don't error" semantics in `runCycle`). **Fix**: Set `onError: "continueErrorOutput"` on all 3 Fetch-Klines nodes so failures route to error pin, allowing Merge/Aggregate to complete with surviving branches.

---

## Verification Summary

**Verdict**: PASS, 0 CRITICAL, 0 WARNING (per `verify-report.md`, final revision — supersedes the intermediate PASS-WITH-WARNINGS pass)

| Metric | Value |
|--------|-------|
| Critical findings | 0 |
| Warnings | 0 |
| Blockers | 0 |
| Tasks complete | 15/15 (all phases 1-5 done) |
| Automatable spec scenarios | 6/6 COMPLIANT |
| Manual verification scenarios | 3/3 PENDING (M1-M5, user's responsibility post-archive) |

**Warning history**: verify originally found 1 non-blocking design-doc wording issue (design.md's A10
checklist item checked for the bare substring `$env`, which its own explanatory `POST /api/cycle` notes
text legitimately contained in prose). Closed post-verify by tightening A10 to check for the `$env.*`
expression construct instead — documentation-only fix, no JSON/code change. Re-verified clean; 0
WARNING remains in the archived `verify-report.md`.

---

## Spec Compliance (Automated Checks)

All 6 automatable spec scenarios independently re-verified COMPLIANT:

- ✅ **A1**: JSON parses; unique node names/ids; all connections resolve
- ✅ **A2**: Exactly one Merge node, typeVersion 3, mode:append, numberInputs:3
- ✅ **A3**: Set-Merge indices exactly {0,1,2}, distinct
- ✅ **A4**: No Set→Aggregate direct edges remain
- ✅ **A5**: Merge→Aggregate[0] is Aggregate's sole inbound edge
- ✅ **A6**: Aggregate.jsCode byte-identical to pre-fix
- ✅ **A7**: onError:continueErrorOutput on all 3 Fetch nodes (top-level, not nested)
- ✅ **A8**: Fetch main[0] wiring unchanged
- ✅ **A9**: POST /api/cycle auth shape correct (genericCredentialType, httpHeaderAuth, credentials entry)
- ✅ **A10-functional**: Zero `$env.FAF_CYCLE_SHARED_SECRET` expressions; zero literal secrets; zero `x-faf-shared-secret` headers

---

## Residual Manual Verification (NOT Performed Here)

No live n8n instance or execution harness exists in this repository. The following steps remain the user's post-archive responsibility, documented in `n8n/POST_IMPORT_STEPS.md`:

- **M1**: Import the corrected workflow into the user's n8n 2.34.6 instance. Verify Merge node renders 3 input pins.
- **M2**: Create a Header Auth credential named "FAF Cycle Shared Secret" with the actual shared secret value (excluded from JSON export).
- **M3**: Replace the `https://REPLACE_WITH_YOUR_DEPLOYED_APP_URL/api/cycle` placeholder with the real deployed app URL.
- **M4**: Execute one full cycle. Confirm:
  - Merge and Aggregate execute without hanging
  - POST /api/cycle returns 200
  - assets.length === 3 with distinct symbols (BTCUSDT, ETHUSDT, SOLUSDT)
- **M5** (optional but recommended): Simulate a single-asset fetch failure (e.g., temporarily invalid symbol or timeout). Confirm:
  - The other 2 assets still deliver in the POST payload
  - Execution does not abort
  - If this test hangs at Merge, apply the fallback (wire each Fetch error output to a sentinel Set node feeding the same Merge input), documented in design.md.

**Critical caveat**: This archive does NOT mean the fix is confirmed working live. It means the implementation is structurally correct per spec and design. Functional proof requires live n8n execution (M1-M5), which the user will perform in their own instance post-archive.

---

## Delivery Route

This change was **applied directly to `main` branch** (not via a feature-branch PR), per explicit user decision given its small single-file low-risk scope:
- Authored diff: 103 lines
- 400-line review budget risk: **Low**
- Single PR feasible: **Yes**
- Chained PRs needed: **No**

Commits:
- `fcd07ab`: Apply Merge/onError/credential fixes to n8n/faf-workflow.json
- `8cd8db4`: Record verify-report and close the A10 wording warning (final verdict: PASS, 0 WARNING)

---

## Artifacts Archived

| File | Status |
|------|--------|
| proposal.md | ✅ Archived |
| exploration.md | ✅ Archived |
| design.md | ✅ Archived |
| tasks.md | ✅ Archived (all 15 tasks [x] complete) |
| verify-report.md | ✅ Archived (PASS, 0 WARNING, final verdict) |
| specs/semantic-ingestion/spec.md | ✅ Archived |

---

## Delta Spec Merged into Main Specs

**Domain**: `semantic-ingestion` (Layer 1)

**Action**: MERGED (additive)

**Requirements added to** `openspec/specs/semantic-ingestion/spec.md`:
1. n8n multi-asset fan-in via Merge node (2 automatable + 1 manual scenario)
2. n8n partial-fetch resilience (2 automatable + 1 manual scenario)
3. n8n shared-secret credential handling (2 automatable + 1 manual scenario)

**Pre-existing requirements preserved**:
1. Market-data fetch contract
2. n8n scheduler-only role (D2)
3. OHLCV to RDF price-event mapping
4. Indicator value RDF mapping

---

## Engram Artifact Observation IDs

For traceability, all SDD artifacts retrieved from Engram during this phase:

| Artifact | Type | Observation ID |
|----------|------|-----------------|
| sdd/n8n-cycle-merge-fix/proposal | architecture | 1510 |
| sdd/n8n-cycle-merge-fix/spec | architecture | 1511 |
| sdd/n8n-cycle-merge-fix/design | architecture | 1512 |
| sdd/n8n-cycle-merge-fix/tasks | architecture | 1513 |
| sdd/n8n-cycle-merge-fix/verify-report | architecture | 1515 |

---

## Final State

✅ **All gates passed**:
- Task Completion Gate: 15/15 tasks marked [x]
- Native Review Receipt Gate: No review was started for this candidate (not applicable); proceed under ordinary repository policy

✅ **Change folder moved to archive**: `openspec/changes/archive/2026-08-17-n8n-cycle-merge-fix/`

✅ **Delta specs merged**: 3 new requirements added to `openspec/specs/semantic-ingestion/spec.md`; pre-existing requirements preserved

✅ **Archive report written**: This file (filesystem) + Engram `sdd/n8n-cycle-merge-fix/archive-report`

---

**SDD Cycle Complete**. Ready for next change.
