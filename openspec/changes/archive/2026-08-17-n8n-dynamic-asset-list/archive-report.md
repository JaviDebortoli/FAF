# Archive Report: n8n Dynamic Asset List (single-pipeline refactor)

**Change**: n8n-dynamic-asset-list  
**Archived**: 2026-08-17  
**Branch**: n8n-dynamic-asset-list/apply (commit `19f4a30`)  
**Status**: COMPLETE — SDD cycle closed, artifacts archived

---

## What Was Fixed / Changed

This change refactored `n8n/faf-workflow.json` from a multi-branch, constant-growth model to a constant-node-count, single-pipeline model:

- **Removed**: 7 nodes (3× `Fetch Klines - {SYMBOL}`, 3× `Set Symbol - {SYMBOL}`, 1× `Merge Assets`)
- **Added**: 3 nodes (`Symbols` Code node emitting one item per symbol, single parameterized `Fetch Klines` node processing items in isolation, single `Set Symbol` node recovering per-item symbols via item linking)
- **Unchanged**: Schedule Trigger, Aggregate Code node, POST /api/cycle node (all carried over byte-identical)
- **Result**: Node count is now independent of asset count (adding a symbol = editing one array literal, zero node structural changes)

### Key Decisions Carried Forward

- **D3 (Load-bearing)**: `Set Symbol` recovers each item's symbol via `$('Symbols').item.json.symbol` (n8n item linking), not `$json.symbol` (which would be Binance's response by that point, not the input symbol)
- **D6 (Byte-identity)**: `Aggregate` and `POST /api/cycle` nodes left byte-identical to pre-change file, including `Aggregate`'s stale "per-branch Set Symbol" wording in its `jsCode` comment (accepted cosmetic residual, recorded in design.md Open Questions)
- **Error isolation**: Per-item failure isolation on one shared `Fetch Klines` node via `onError: "continueErrorOutput"` (same guarantee as the 3 separate nodes previously achieved)
- **Credential handling**: Unchanged — `POST /api/cycle` carries the Header Auth credential reference `{ id: null, name: "FAF Cycle Shared Secret" }` byte-identical

---

## Verification Summary

**Verdict**: PASS  
**Per verify-report.md** (obs #1524, verified at commit `19f4a30`):

- Blockers: 0
- Critical findings: 0
- Requirements verified: 3/3 (all spec scenarios covered)
- Automatable scenarios: 8/8 COMPLIANT (independently re-derived structural checks)
- Non-blocking suggestions: 2
  1. Launch-prompt scenario count discrepancy (spec defines 11 total scenarios: 8 automatable + 3 manual, not the 13 initially stated) — non-blocking, all actual scenarios accounted for and verified
  2. Aggregate's stale "per-branch" comment (D6 deliberate, recorded in Open Questions) — non-blocking cosmetic residual, zero impact
- Manual verification scenarios: 3 PENDING (M4, M5, M5 — user's post-archive responsibility)

**Coverage**:
- 14/14 independent structural checks (A1 precondition + 6 ADDED-requirement scenarios + 2 MODIFIED-requirement scenarios + D3/D6 design verification) all PASS
- No regressions detected in partial-fetch resilience, credential handling, or file integrity
- Merge node completely removed; linear topology confirmed

---

## Spec Compliance

The delta spec (obs #1520) has been fully merged into `openspec/specs/semantic-ingestion/spec.md`:

| Change | Action | Details |
|--------|--------|---------|
| `n8n multi-asset fan-in via Merge node` | REMOVED | Reason: The 3 parallel fetch branches this Merge-based fan-in converged no longer exist; the single-pipeline refactor eliminates the entire "parallel branches silently drop data without Merge" bug class this requirement guarded against. Migration: Replaced by "n8n symbol-list-driven single-pipeline fan-out" below |
| `n8n symbol-list-driven single-pipeline fan-out` | ADDED | 7 scenarios (6 automatable + 1 manual): constant node count, no Merge node, parameterized fetch, symbol list matching, strictly linear topology, batching no-op at N=3, and live-cycle asset delivery |
| `n8n partial-fetch resilience` | MODIFIED | Scenarios now reflect per-item isolation on one shared Fetch node instead of 3 separate nodes; added `pairedItem` metadata sanity check (M5 manual scenario) to guard against n8n-io/n8n#30050 edge case |
| `n8n shared-secret credential handling` | UNCHANGED | POST /api/cycle node unchanged; credential stays credential-reference only, no literal/`$env` leak |
| Market-data fetch contract | UNCHANGED | |
| n8n scheduler-only role (D2) | UNCHANGED | |
| OHLCV to RDF price-event mapping | UNCHANGED | |
| Indicator value RDF mapping | UNCHANGED | |

**Result**: `openspec/specs/semantic-ingestion/spec.md` now reflects the refactored architecture: 7 requirements total (down from 8 due to Merge-node removal), with 11 scenarios (8 automatable, 3 manual).

---

## Residual Manual Verification (User's Post-Archive Responsibility)

Per verify-report.md, 3 spec scenarios cannot be automated (no live n8n instance exists in this repo) and remain PENDING for the user to confirm post-archive:

| Scenario | Checklist | Reference |
|----------|-----------|-----------|
| Live cycle delivers all configured assets | Execute once in n8n instance; confirm `assets.length === 3` with all 3 distinct symbols, each with non-empty `klines` array; POST /api/cycle returns 200 | n8n/POST_IMPORT_STEPS.md M4 |
| Live cycle survives a single-asset fetch failure | Break one symbol deliberately; confirm execution does not abort, remaining 2 assets still delivered, POST /api/cycle succeeds with 2 assets | n8n/POST_IMPORT_STEPS.md M5 |
| pairedItem metadata does not corrupt symbol/klines pairing | Under same induced failure, confirm each surviving asset's `klines` plausibly belongs to its symbol (price magnitude check, not just count); if loud error or silent mispairing appears, apply design.md Fallback A or B (do not improvise) | n8n/POST_IMPORT_STEPS.md M5 |

---

## Delivery Route

**Branch**: n8n-dynamic-asset-list/apply  
**Commit**: 19f4a30  
**Status**: NOT YET merged to main  
**Decision**: Merge/PR routing belongs to the orchestrator (this archive phase does not perform git operations beyond the mechanical folder move)

Files modified on branch:
- `n8n/faf-workflow.json` (−7 nodes, +3 nodes; connections replaced; Aggregate/POST byte-identical)
- `n8n/POST_IMPORT_STEPS.md` (M-series rewritten; all `Merge Assets` references removed)
- `openspec/changes/n8n-dynamic-asset-list/tasks.md` (all 25 tasks marked `[x]`)

Git diff summary (commit `19f4a30` vs main):
- +/- 32/133 lines in faf-workflow.json (net: −101 lines, primarily node removal)
- +/- 47/17 lines in POST_IMPORT_STEPS.md (net: +30 lines)
- +/- 72/0 lines in tasks.md (net: +72 lines, task checkmarks)
- **Total**: 301 changed lines (301+17+72−133−17 = well under 400-line PR budget)

---

## Artifacts Archived

| Artifact | Location | Status |
|----------|----------|--------|
| proposal.md | `openspec/changes/archive/2026-08-17-n8n-dynamic-asset-list/proposal.md` | ✅ Moved |
| design.md | `openspec/changes/archive/2026-08-17-n8n-dynamic-asset-list/design.md` | ✅ Moved |
| tasks.md | `openspec/changes/archive/2026-08-17-n8n-dynamic-asset-list/tasks.md` | ✅ Moved (25/25 complete) |
| delta spec.md | `openspec/changes/archive/2026-08-17-n8n-dynamic-asset-list/specs/semantic-ingestion/spec.md` | ✅ Moved |
| verify-report.md | `openspec/changes/archive/2026-08-17-n8n-dynamic-asset-list/verify-report.md` | ✅ Moved |
| archive-report.md | `openspec/changes/archive/2026-08-17-n8n-dynamic-asset-list/archive-report.md` | ✅ Written (this file) |

**Verification**: Mechanical folder move verified with empty `diff -r` output (byte-identity confirmed). Archive folder confirmed present, source folder confirmed absent.

---

## Delta Spec Merged

| Requirement | Action | Scenarios | Reference |
|-------------|--------|-----------|-----------|
| n8n symbol-list-driven single-pipeline fan-out | ADDED | 7 (6 automatable: node count, no Merge, parameterized fetch, symbol list, linear topology, batching; 1 manual: live asset delivery) | Delta spec ADDED section |
| n8n partial-fetch resilience | MODIFIED | 4 (2 automatable: error routing, success wiring; 2 manual: single-asset failure, pairedItem sanity) | Delta spec MODIFIED section |
| n8n multi-asset fan-in via Merge node | REMOVED | (reason + migration noted) | Delta spec REMOVED section |

**Merge Location**: `openspec/specs/semantic-ingestion/spec.md` (updated in-place; no manual copy-merge required, no transactional issues)

---

## Engram Observation IDs (for traceability)

| Artifact | Observation ID | Topic Key |
|----------|----------------|-----------|
| proposal.md | 1518 | sdd/n8n-dynamic-asset-list/proposal |
| spec (delta).md | 1520 | sdd/n8n-dynamic-asset-list/spec |
| design.md | 1521 | sdd/n8n-dynamic-asset-list/design |
| tasks.md | 1522 | sdd/n8n-dynamic-asset-list/tasks |
| apply-progress.md | 1523 | sdd/n8n-dynamic-asset-list/apply-progress |
| verify-report.md | 1524 | sdd/n8n-dynamic-asset-list/verify-report |
| archive-report.md | (new) | sdd/n8n-dynamic-asset-list/archive-report |

---

## Final State Gates

✅ **Task Completion Gate**: All 25 implementation tasks marked `[x]` in archived tasks.md; no stale checkboxes.

✅ **Spec Merge Gate**: Delta spec (ADDED/MODIFIED/REMOVED) fully applied to main spec; 7 requirements now in effect (down from 8); 11 scenarios total (8 automatable COMPLIANT, 3 manual PENDING per user responsibility).

✅ **Mechanical Archive Gate**: Folder moved via shell (`mv`), verified with empty `diff -r` (byte-identity confirmed); source folder confirmed absent.

✅ **Verification Gate**: PASS with 0 CRITICAL, 0 WARNING, 2 non-blocking SUGGESTIONS; all 8 automatable scenarios COMPLIANT; 3 manual scenarios correctly marked PENDING (user's post-archive responsibility documented in `n8n/POST_IMPORT_STEPS.md`).

✅ **Native Review Receipt Gate**: No review gate present (receipt-driven development not active for this candidate); archive proceeds under ordinary repository policy.

---

## Summary

The n8n-dynamic-asset-list SDD change has been **successfully archived**. The refactored workflow (constant-node-count single pipeline) passes all structural verification checks, the delta spec has been merged into the main semantic-ingestion spec, and all artifacts have been moved to the archive with byte-identity confirmed. The change is ready for merge to main by the orchestrator; residual manual verification (M4/M5 live-cycle checks) remains the user's responsibility post-archive.

---

**Archive completed**: 2026-08-17  
**Prepared by**: sdd-archive executor
