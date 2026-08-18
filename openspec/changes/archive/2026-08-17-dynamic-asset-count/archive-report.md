# Archive Report: Dynamic Asset Count (n8n payload as sole asset source)

**Change**: dynamic-asset-count  
**Archived**: 2026-08-17  
**Branches**: 4 stacked PRs (not yet merged to main)
- PR1: `dynamic-asset-count/pr1-ingestion-validation` (commit `1048b0f`, off `main`)
- PR2a: `dynamic-asset-count/pr2a-decisions-read-path` (commit `19754af`, off PR1)
- PR2b: `dynamic-asset-count/pr2b-narrative-push-only` (commit `80c7b08`, off PR2a)
- PR3: `dynamic-asset-count/pr3-dashboard-no-data-ux` (commits `47c8729` + `fcb3f80`, off PR2b)

**Status**: COMPLETE — SDD cycle closed, artifacts archived, Strict TDD verification PASS

---

## What Was Fixed / Changed

This change implements push-only asset ingestion, replacing enumerated membership (`ASSET_ALLOWLIST`) with a format predicate (`isWellFormedAsset`) and a standalone count cap (`MAX_ASSETS = 25`), so n8n's `POST /api/cycle` payload becomes the sole source of asset identity. Two architectural seams changed:

1. **Identity**: Enumerated `ASSET_ALLOWLIST` / `AllowedAsset` / `isAllowedAsset` (3 symbols) removed from `src/market/assets.ts`; replaced by format regex `^[A-Z0-9]{2,20}USDT$` + standalone `MAX_ASSETS = 25` cap (decoupled from list length).

2. **Direction**: Ingestion becomes strictly push-only:
   - Removed `pullAllAssets()` call sites from `GET /api/decisions` and narrative-route fallback
   - Both GET read paths now become pure cache reads; cache miss returns last cached data (possibly empty) or a 503 NO_DATA state
   - Deleted `src/cycle/pullAssets.ts` (no remaining callers; its only symbol source was the removed allowlist)
   - Retained `BinanceHttpSource` in `src/market/binance.ts` with swapped guard (`isWellFormedAsset`); guarded by static-import test; n8n's `Fetch Klines` HTTP Request node now satisfies the "Market-data fetch contract" requirement

### Work Units & Implementation Tasks

| Unit | PR | Focus | Tasks | Status |
|------|----|----|-------|--------|
| 1 | PR1 | Validation boundary swap: predicate, cycle gate+cap, binance guard, n8n notes | 9 tasks (1.1–1.9) | ✅ Complete (25+0 bonus structural checks) |
| 2a | PR2a | Push-only `GET /api/decisions`: 503 NO_DATA, drop `pullAllAssets`, seeding helper | 5 tasks (2a.1–2a.7, with 2a.6 deviation noted) | ✅ Complete (behavioral + structural verification) |
| 2b | PR2b | Push-only narrative route: format gate, delete `getDecisionForAsset` | 3 tasks (2b.1–2b.3) | ✅ Complete (format gate + static import guard verified) |
| 3 | PR3 | Dashboard no-data UX: `ServiceUnavailable` component, `OverviewClient` view-state machine | 4 tasks (3.1–3.4) | ✅ Complete (11/11 e2e tests passing) |
| **Total** | | | 28 tasks (Phases 1-4) | **25/25 implementation + 3/3 verification = 28/28** |

### Key Decisions Carried Forward

- **Format replaces enumeration**: Honest predicate name (`isWellFormedAsset` vs. `isAllowedAsset`); 4 call-site renames (mechanical).
- **503 NO_DATA vs. empty 200**: Status code makes no-data state distinguishable from genuine 0-decision cycle; reuses narrative route's existing `{error, code}` shape.
- **New `ServiceUnavailable` component**: Semantically distinct from `EmptyState` (data-presence vs. selection-results); `EmptyState` untouched, zero regression risk.
- **Stale doc-comment corrections**: 5 TypeScript files + n8n workflow JSON corrected as per design.md Supersession list (post-verify amendment: commit `fcb3f80` fixed the jsCode inline comment).
- **Deferred deletion for PR boundary clarity**: `src/cycle/pullAssets.ts` deletion deferred from Phase 2a to Phase 2b (2a.6 deviation noted); no hidden dependencies across PR boundaries; self-cleaning via natural `tsc --noEmit` gate passage.

---

## Verification Summary

**Verdict**: PASS (final — supersedes intermediate PASS_WITH_WARNINGS)  
**Per verify-report.md** (obs #1536, verified at commit `47c8729`; post-verify amendment: commit `fcb3f80`):

- **Blockers**: 0
- **Critical findings**: 0
- **Warning remaining**: 0 (original 1 stale jsCode inline comment fixed post-verify by orchestrator; re-confirmed)
- **Requirements verified**: 6/6 (semantic-ingestion 3, decision-narrative 1, decision-dashboard 2)
- **Scenarios automatable**: 19/19 COMPLIANT (all with passing covering tests)
- **Scenarios manual-only**: 1 PENDING (live n8n cycle with 4+ symbols — user's post-archive responsibility)
- **Non-blocking suggestions**: 3 (scenario-count table summarization note, BinanceHttpSource dead-code accepted tradeoff, cache-size vs. MAX_ASSETS tradeoff)

### Build & Tests Execution

- **Build**: `npx tsc --noEmit` — PASSED (0 errors, independently re-run at verify time)
- **Unit/Integration tests**: 217 passed (35 test files) — `npx vitest run` independently re-run (not copied from apply-progress)
- **E2E tests**: 11 passed (Playwright chromium, including new "no-data state" test)
- **Coverage**: Not configured (consistent with repo precedent)

### Coverage by Domain

| Domain | Requirement | Scenarios | Result |
|--------|-------------|-----------|--------|
| **semantic-ingestion** | POST /api/cycle symbol validation contract | 4 automatable (well-formed unseen, malformed, exceeds MAX_ASSETS, missing secret) | ✅ COMPLIANT |
| | Push-only asset ingestion | 2 automatable (cache miss, sole entry point) | ✅ COMPLIANT |
| | n8n symbol-list-driven single-pipeline fan-out | 7 automatable (node count, no Merge, parameterized, duplication check retired, linear, batching, + 1 manual live asset delivery) | ✅ COMPLIANT (7 auto) / PENDING (1 manual) |
| **decision-narrative** | Narrative endpoint contract | 3 automatable (valid asset, malformed symbol, well-formed unknown) | ✅ COMPLIANT |
| **decision-dashboard** | No-data UX | 2 automatable (architecture-agnostic message, distinct from filter-empty) | ✅ COMPLIANT |
| | Multi-asset display | 2 automatable (multiple active, card count follows n8n) | ✅ COMPLIANT |

**Total**: 19/19 automatable scenarios COMPLIANT; 1/1 manual scenario PENDING (per spec design).

---

## Spec Compliance

The 3 delta specs have been fully merged into their respective main specs:

### semantic-ingestion

| Change | Action | Details |
|--------|--------|---------|
| POST /api/cycle symbol validation contract | ADDED | 4 scenarios (shared-secret unchanged, format gate, MAX_ASSETS=25, no allowlist) |
| Push-only asset ingestion | ADDED | 2 scenarios (cache miss does not pull, sole entry point) |
| n8n symbol-list-driven single-pipeline fan-out | MODIFIED | 1 scenario replaced: "Symbol list matches allowlist" → "Symbol-list-to-allowlist duplication check is retired" (vacuous scenario replaced by explanation); other 6 scenarios unchanged (node count, no Merge, parameterized, linear, batching, manual live asset) |
| Market-data fetch contract | UNCHANGED | (still required; n8n workflow's Fetch node now satisfies it, not pullAssets.ts) |
| n8n scheduler-only role | UNCHANGED | |
| OHLCV to RDF price-event mapping | UNCHANGED | |
| Indicator value RDF mapping | UNCHANGED | |
| n8n partial-fetch resilience | UNCHANGED | |
| n8n shared-secret credential handling | UNCHANGED | |

**Result**: 9 requirements total in `openspec/specs/semantic-ingestion/spec.md` (2 new, 1 modified, 6 unchanged).

### decision-narrative

| Change | Action | Details |
|--------|--------|---------|
| Narrative endpoint contract | MODIFIED | 2 scenarios replaced: "Unknown asset rejected" (allowlist membership) → "Malformed symbol rejected" (format gate) + "Well-formed but unknown yields no-decision" (distinct error family); requirement description: allowlist → format regex |
| Spanish-language output | UNCHANGED | |
| Visible AI-generated disclaimer | UNCHANGED | |
| Graceful degradation on failure | UNCHANGED | |
| Cost-mitigation caching | UNCHANGED | |

**Result**: 5 requirements total in `openspec/specs/decision-narrative/spec.md` (0 new, 1 modified, 4 unchanged).

### decision-dashboard

| Change | Action | Details |
|--------|--------|---------|
| No-data UX (cache-miss empty state) | ADDED | 2 scenarios (architecture-agnostic message, distinct from filter-empty) |
| Multi-asset display | MODIFIED | 1 scenario added: "Card count follows n8n's last push, not source code"; requirement description: "every configured asset" → "every asset in n8n's last push" |
| Card overview (Tier 1) | UNCHANGED | |
| Tier 2 drill-down | UNCHANGED | |
| LLM narrative and graph visualization confined to Tier 2 | UNCHANGED | |

**Result**: 5 requirements total in `openspec/specs/decision-dashboard/spec.md` (1 new, 1 modified, 3 unchanged).

**Merge Locations**: All three main specs (`openspec/specs/semantic-ingestion/spec.md`, `openspec/specs/decision-narrative/spec.md`, `openspec/specs/decision-dashboard/spec.md`) updated in-place; delta specs archived in `openspec/changes/archive/2026-08-17-dynamic-asset-count/specs/`.

---

## Residual Manual Verification (User's Post-Archive Responsibility)

Per verify-report.md, 1 spec scenario cannot be automated (no live n8n instance exists in this repo) and remains PENDING for the user to confirm post-archive:

| Scenario | Checklist | Reference |
|----------|-----------|-----------|
| Live cycle delivers all configured assets | Import refactored workflow in user's n8n instance; execute with 4+ symbols; confirm POST /api/cycle payload's `assets` array contains all of them with non-empty `klines` per asset | semantic-ingestion delta spec, "n8n symbol-list-driven single-pipeline fan-out" requirement, manual scenario |

**Same pattern as archived `n8n-dynamic-asset-list` change**: structural/behavioral verification complete; live n8n execution is user-environment-only.

---

## Delivery Route

**Branches (4 stacked PRs, NOT YET merged to main)**:
- `dynamic-asset-count/pr1-ingestion-validation` (commit `1048b0f`)
- `dynamic-asset-count/pr2a-decisions-read-path` (commit `19754af`)
- `dynamic-asset-count/pr2b-narrative-push-only` (commit `80c7b08`)
- `dynamic-asset-count/pr3-dashboard-no-data-ux` (tip: commit `fcb3f80`)

**Git diff summary** (`fcb3f80` vs `main`):
- 20 files changed, 532 insertions(+), 281 deletions(−)
- Phases 1-3 implementation + Phase 4 verification self-checks all satisfied
- No uncommitted changes except unrelated `.agents/`, `.claude/`, `skills-lock.json`

**Status**: Archive phase complete. Merge/PR/delivery routing decisions belong to the orchestrator (this archive phase performs only the mechanical folder move and spec merge, not git operations for branch management).

---

## Artifacts Archived

| Artifact | Location | Status |
|----------|----------|--------|
| proposal.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/proposal.md` | ✅ Moved |
| design.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/design.md` | ✅ Moved |
| tasks.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/tasks.md` | ✅ Moved (25/25 complete) |
| specs/semantic-ingestion/spec.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/specs/semantic-ingestion/spec.md` | ✅ Moved (delta) |
| specs/decision-narrative/spec.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/specs/decision-narrative/spec.md` | ✅ Moved (delta) |
| specs/decision-dashboard/spec.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/specs/decision-dashboard/spec.md` | ✅ Moved (delta) |
| verify-report.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/verify-report.md` | ✅ Moved |
| archive-report.md | `openspec/changes/archive/2026-08-17-dynamic-asset-count/archive-report.md` | ✅ Written (this file) |

**Verification**: Mechanical folder move via shell (`mv`), verified with empty `diff -r` output (byte-identity confirmed). Source folder `openspec/changes/dynamic-asset-count/` confirmed absent.

---

## Delta Specs Merged

| Domain | Requirement | Action | Scenarios | Reference |
|--------|-------------|--------|-----------|-----------|
| semantic-ingestion | POST /api/cycle symbol validation contract | ADDED | 4 automatable | Delta spec ADDED section |
| | Push-only asset ingestion | ADDED | 2 automatable | Delta spec ADDED section |
| | n8n symbol-list-driven single-pipeline fan-out | MODIFIED | 7 (6 auto: node count, no Merge, parameterized, linear, batching + 1 manual: live asset delivery); 1 scenario replaced | Delta spec MODIFIED section |
| decision-narrative | Narrative endpoint contract | MODIFIED | 3 automatable (format gate for malformed, distinct error for well-formed unknown) | Delta spec MODIFIED section |
| decision-dashboard | No-data UX (cache-miss empty state) | ADDED | 2 automatable | Delta spec ADDED section |
| | Multi-asset display | MODIFIED | 2 automatable; 1 scenario added (card count follows n8n) | Delta spec MODIFIED section |

**Merge Location**: `openspec/specs/` subdirectories (`semantic-ingestion/spec.md`, `decision-narrative/spec.md`, `decision-dashboard/spec.md`) updated in-place.

---

## Engram Observation IDs (for traceability)

| Artifact | Observation ID | Topic Key |
|----------|----------------|-----------|
| proposal.md | 1529 | sdd/dynamic-asset-count/proposal |
| spec (delta).md | 1531 | sdd/dynamic-asset-count/spec |
| design.md | 1532 | sdd/dynamic-asset-count/design |
| tasks.md | 1533 | sdd/dynamic-asset-count/tasks |
| verify-report.md | 1536 | sdd/dynamic-asset-count/verify-report |
| archive-report.md | (new) | sdd/dynamic-asset-count/archive-report |

---

## Final State Gates

✅ **Task Completion Gate**: All 25 implementation tasks (Phases 1-3) verified complete; Phase 4's 3 verification tasks satisfied by sdd-verify's own independent execution (not copied from apply-progress). No stale checkboxes.

✅ **Spec Merge Gate**: Delta specs (ADDED/MODIFIED/REMOVED per 3 domains) fully applied to main specs; `openspec/specs/semantic-ingestion/spec.md` now has 9 requirements; `decision-narrative/spec.md` unchanged at 5; `decision-dashboard/spec.md` now has 5.

✅ **Mechanical Archive Gate**: Folder moved via shell (`mv`) from `openspec/changes/dynamic-asset-count/` to `openspec/changes/archive/2026-08-17-dynamic-asset-count/`, verified with empty `diff -r` (byte-identity confirmed); source folder confirmed absent.

✅ **Verification Gate**: PASS with 0 CRITICAL, 0 WARNING remaining (1 original WARNING fixed post-verify; re-confirmed), 3 non-blocking SUGGESTIONS; all 19/19 automatable scenarios COMPLIANT; 1/1 manual scenario correctly marked PENDING (user's post-archive responsibility, same pattern as `n8n-dynamic-asset-list`).

✅ **Spec Compliance Gate**: All 6/6 requirements across 3 domains verified; 19/19 automatable scenarios with passing tests; 1/1 manual scenario scoped to user responsibility.

---

## Archive Closure

This change is **closed and archived**. The 4 stacked branches are implementation-complete and verification-complete. Merge routing and delivery strategy decisions are the orchestrator's responsibility. The delta specs have been merged into the main openspec files, and this report completes the SDD cycle.
