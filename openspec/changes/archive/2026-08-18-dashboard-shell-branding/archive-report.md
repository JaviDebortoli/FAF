# Archive Report: dashboard-shell-branding

**Archived**: 2026-08-18
**Change**: dashboard-shell-branding — sidebar branding + shared footer
**Status**: Complete and verified
**Verdict**: PASS

## What Was Built

Small gap-closing change (3 source files + 1 test file, ~150 lines) that adds two missing shell-level UI elements to the dashboard:

1. **Sidebar branding block**: "Plataforma FAF" title + "Recomendaciones financieras explicables en tiempo real" subtitle, rendered as the first element in both the desktop sidebar and mobile drawer navigation — above all market groups, consistent with mockup.

2. **Shared shell footer**: Single fixed footer instance at the shell level (inherited by all ~10 `/dashboard/*` routes) with exact verbatim disclaimer + attribution copy, replacing the old crypto-only per-page footer. Old "Trabajo de tesis" text fully removed.

Both elements required bottom-padding reservation on the content wrapper to prevent overlap. Implementation includes comprehensive Playwright layout assertions at both desktop (1280px) and mobile (375px) viewports.

## Verification Summary

**Verdict**: PASS per verify-report (independent orchestrator re-run)
**Requirements**: 2/2 compliant (1 MODIFIED + 1 ADDED)
**Scenarios**: 7/7 compliant
**Test Results**:
- 223/223 vitest passed (36 test files, zero regressions)
- `tsc --noEmit` clean
- 34/34 Playwright (28 pre-existing + 6 new scenarios)

**No manual-verification-only scenarios.**

### Issues Found
- CRITICAL: None
- WARNING: None
- SUGGESTION: None

### Documented Deviations

Per verify-report, two minor corrections to design.md were made during apply and independently re-verified:

1. **Bottom-padding value**: design.md estimated `pb-28` (112px) but actual footer height at 375px viewport measured 177.5px via `getBoundingClientRect()`. Corrected to `pb-48` (192px); overlap assertion passing at both 1280px (measured 99.5px) and 375px (measured 177.5px).

2. **Footer text assertion**: design.md's sketch used Playwright `toHaveText()` against an `innerText()`-captured string. `toHaveText` internally compares `textContent` (which omits inter-paragraph line breaks) against `innerText()` values (which include them). Fixed to `expect.poll(() => footer.innerText()).toBe(cryptoFooterText)` for consistent `innerText()` comparison on both sides. Same test intent, corrected mechanics.

Both deviations are design.md's own documented-as-uncertain assumptions, explicitly flagged for empirical verification; the verify-report confirms both corrections improve accuracy.

## Spec Compliance Matrix

| Domain | Requirement | Status | Scenarios |
|--------|-------------|--------|-----------|
| market-navigation | Sidebar navigation shell (MODIFIED) | Compliant | 3/3 (added: branding header renders desktop+mobile) |
| market-navigation | Shared shell footer (ADDED) | Compliant | 4/4 |
| market-navigation | (5 others unchanged) | Compliant | (11/11 pre-existing, re-confirmed) |

**Unchanged requirements** (verified no regression): Per-market routing, Placeholder-market page, Mobile navigation drawer, Sidebar accessibility baseline, No new CDN/font dependency.

## Delivery Route

**Single PR** on branch `dashboard-shell-branding/apply` (commit 670e412, off main).
- **NOT YET MERGED** — merge/push decision belongs to the orchestrator.
- Actual diff: 4 files changed, 95 insertions(+), 5 deletions(-) — well under 400-line review budget.
- No schema, routing, or reasoning-core changes; fully revertible.

## Artifacts Archived

| Artifact | Path | Status |
|----------|------|--------|
| proposal.md | `openspec/changes/archive/2026-08-18-dashboard-shell-branding/proposal.md` | ✅ |
| specs/ | `openspec/changes/archive/2026-08-18-dashboard-shell-branding/specs/market-navigation/spec.md` (delta) | ✅ |
| design.md | `openspec/changes/archive/2026-08-18-dashboard-shell-branding/design.md` | ✅ |
| tasks.md | `openspec/changes/archive/2026-08-18-dashboard-shell-branding/tasks.md` (13/13 tasks ✅) | ✅ |
| verify-report.md | `openspec/changes/archive/2026-08-18-dashboard-shell-branding/verify-report.md` | ✅ |

**Verified via `diff -r`**: Empty output confirms bit-perfect archival.

## Delta Spec Merged

| Domain | Action | Details |
|--------|--------|---------|
| market-navigation | MODIFIED | Sidebar navigation shell: added branding header (title + subtitle) as first element of desktop + mobile nav; added 1 scenario |
| market-navigation | ADDED | Shared shell footer: exact verbatim copy, zero duplication per-page, old footer fully removed, no overlap with content; 4 scenarios |

**Destination**: `openspec/specs/market-navigation/spec.md`  
**Merge method**: Direct content replacement for requirement descriptions + new requirement insertion.  
**Verification**: All 7 delta scenarios now part of main spec; 5 unchanged requirements preserved.

## Engram Observation IDs

| Artifact | Observation ID | Topic Key |
|----------|---|---|
| Proposal | 1584 | sdd/dashboard-shell-branding/proposal |
| Spec (delta) | 1585 | sdd/dashboard-shell-branding/spec |
| Design | 1587 | sdd/dashboard-shell-branding/design |
| Tasks | 1589 | sdd/dashboard-shell-branding/tasks |
| Verify-report | (persisted to filesystem only, not Engram) | — |

## Final State Gates

✅ **Task Completion**: 13/13 tasks checked in `tasks.md`, all complete.  
✅ **Spec Merge**: Delta specs merged into main specs (`openspec/specs/market-navigation/spec.md`).  
✅ **Archive Move**: Change folder moved to `openspec/changes/archive/2026-08-18-dashboard-shell-branding/` via `git mv`, verified by empty `diff -r`.  
✅ **Verification**: Independent orchestrator re-run confirms PASS verdict; 7/7 scenarios, 2/2 requirements, zero blockers/CRITICAL/WARNING.  
✅ **No Regressions**: Full Playwright suite (34/34) and vitest (223/223) passing; 28 pre-existing tests unchanged.  

## SDD Cycle Status

**Complete and ready for delivery.**  
The change has been fully planned (proposal), specified (delta spec merged into main), designed (with documented empirical corrections), implemented, verified (independent orchestrator run, PASS), and archived.  
Next step: Orchestrator commits/merges to main and opens PR.
