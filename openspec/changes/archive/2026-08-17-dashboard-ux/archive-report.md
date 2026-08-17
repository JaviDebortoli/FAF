# Archive Report: dashboard-ux

**Change**: dashboard-ux (Two-tier explainable decision dashboard)  
**Archived**: 2026-08-17  
**Status**: Complete and verified; ready for merge to main  
**Archive Location**: `openspec/changes/archive/2026-08-17-dashboard-ux/`  

## Summary

The `dashboard-ux` change delivers a styled, two-tier decision dashboard with explainability as its core feature. The v1 dashboard (raw HTML, unstyled) is replaced with a card-based Tier 1 overview showing actionable (BUY/SELL) decisions only, supplemented by a Tier 2 drill-down with deterministic argumentation graph and server-side Spanish LLM narrative. All work is implemented across 6 stacked branches (PR1a → PR1b → PR2a → PR2b → PR3 → PR4), all committed and verified, awaiting merge to main.

## Verification Verdict

**PASS** — All 55 tasks complete, 204 unit tests, 10 e2e tests, clean TypeScript build.

- **Blockers**: 0 CRITICAL
- **Warnings**: 0 WARNING
- **Suggestions**: 2 low-risk, non-blocking
- **Requirements**: 9/9 (decision-dashboard 4/4, decision-narrative 5/5)
- **Scenarios**: 18/18 all COMPLIANT
- **Task Completion**: 55/55 [x]

Per `sdd/dashboard-ux/verify-report` (#1507), verdict is PASS with all evidence independently re-verified at verification time (commit d64f20ee6f9a6274e14f8f7d21435e46eb36c344, branch dashboard-ux/pr4-e2e-rewrite).

## Specifications Merged

### decision-dashboard (MODIFIED)
- **Action**: Replaced 4 legacy requirements with 4 new MODIFIED requirements
- **Removed**: Tabular decision view, argument trace detail view, blanket D3 ban on LLM/graph
- **Added**: Card overview (Tier 1), Tier 2 drill-down, LLM/graph confined to Tier 2 (D7 narrowing of D3)
- **Details**: 10 scenarios across 4 requirements, all verified
- **Merge note**: Delta spec header changed from "# Delta for..." to "# decision-dashboard Specification" for consistency with main spec convention

### decision-narrative (NEW)
- **Action**: Created new domain spec (no prior spec existed)
- **Content**: 5 requirements, 8 scenarios for server-side narrative endpoint
- **Mechanical copy**: Byte-identical (verified by diff -r)
- **Details**: Narrative endpoint contract, Spanish-language output, visible disclaimer, graceful degradation, cost-mitigation caching

## Implementation State

**Branch chain**: All 6 work units committed and verified on stacked branches:
1. **PR1a** (Tailwind v4 setup + pure Tier 1 geometry) — 12 tasks
2. **PR1b** (Tier 1 UI — card grid, filter, empty state) — 9 tasks
3. **PR2a** (Narrative core modules) — 10 tasks
4. **PR2b** (Narrative route + docs + D7 deviations) — 8 tasks
5. **PR3** (Tier 2 UI — argument graph, drill-down, narrative panel) — 7 tasks
6. **PR4** (E2E rewrite) — 9 tasks

**Current HEAD**: `dashboard-ux/pr4-e2e-rewrite` (tip of the 6-branch stack)  
**Merge strategy**: Stacked to main (each PR targets the prior branch until final merge to main)  
**State**: Verified and ready to merge; branches NOT yet merged to main (this archive reflects the ready-to-merge state, not a shipped-to-main state, unlike the prior `faf-platform` archive)

## Task Completion

All 55 implementation tasks marked [x] and spot-checked in verification:

| Phase | PR | Tasks | Status |
|-------|-----|----|--------|
| 1 | 1a | 12/12 | [x] COMPLETE |
| 2 | 1b | 9/9 | [x] COMPLETE |
| 3 | 2a | 10/10 | [x] COMPLETE |
| 4 | 2b | 8/8 | [x] COMPLETE |
| 5 | 3 | 7/7 | [x] COMPLETE |
| 6 | 4 | 9/9 | [x] COMPLETE |
| **Total** | — | **55/55** | **[x] COMPLETE** |

## Test Coverage

- **Unit tests**: 204 passed / 0 failed (34 files)
- **E2E tests**: 10 passed / 0 failed (1 file: `tests/e2e/dashboard.spec.ts` rewritten)
- **Build**: TypeScript clean (npx tsc --noEmit, exit 0)

All tests independently re-run during verification phase; no stale snapshots.

## Deviation D7 — Approved

Narrowing of Deviation D3 (PRD), recorded in `docs/PRD.md` and encoded in the decision-dashboard spec:

- **D3 (prior)**: LLM narrative and argumentation graph deferred to v2; banned everywhere in v1
- **D7 (approved)**: D3 remains in force EXCEPT inside Tier 2 drill-down for a single asset
- **Verification**: D7's 6 clauses all verified structurally (import-graph isolation, lazy fetch, no score leakage, key-absent equivalence, visible disclaimer, no L1-L4 module imports)
- **Boundary**: Tier 1 stays fully deterministic; narrative and graph available only after user-initiated drill-down open; no global exemption

## Archive Verification

**Spec merge**: ✓ decision-dashboard updated, decision-narrative copied (diff verified, byte-identical for new spec)  
**Folder move**: ✓ Source snapshot → archived copy (diff verified, empty result — no truncation)  
**Task state**: ✓ All 55 tasks [x] confirmed as honest by spot-check against filesystem/test runs  
**Artifacts preserved**: ✓ All change folder contents moved intact (proposal.md, specs/, design.md, tasks.md, state.yaml, verify-report.md)

## Traceability — Engram Observation IDs

All artifacts retrieved from Engram at archive time:

- **Proposal**: #1455 `sdd/dashboard-ux/proposal`
- **Spec**: #1456 `sdd/dashboard-ux/spec`
- **Design**: #1457 `sdd/dashboard-ux/design`
- **Tasks**: #1458 `sdd/dashboard-ux/tasks`
- **Verify Report**: #1507 `sdd/dashboard-ux/verify-report`
- **Archive Report** (this file): `sdd/dashboard-ux/archive-report`

## Key Artifacts Preserved

All files from `openspec/changes/dashboard-ux/` moved to `openspec/changes/archive/2026-08-17-dashboard-ux/`:

- `proposal.md` ✓
- `specs/decision-dashboard/spec.md` ✓
- `specs/decision-narrative/spec.md` ✓ (new)
- `design.md` ✓
- `tasks.md` ✓ (55/55 [x])
- `state.yaml` ✓
- `verify-report.md` ✓

## Next Steps

The 6-branch stack is verified and archived. The next action is to merge the branches into main via GitHub in order (PR1a → main, then PR1b → main, etc., or as a single stacked sequence depending on CI/review capacity). The archive report documents the state at close: fully planned, implemented, verified, and ready to ship.

---

**Archived by**: sdd-archive phase executor  
**Date**: 2026-08-17  
**Mode**: hybrid (specs merged in filesystem, archive report persisted to Engram + filesystem)  
**Disposition**: Complete. SDD cycle for `dashboard-ux` is closed. Ready for delivery.
