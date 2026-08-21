# Archive Report: inicio-home-section

**Change**: inicio-home-section
**Archived**: 2026-08-21
**Archived to**: `openspec/changes/archive/2026-08-21-inicio-home-section/`
**Mode**: hybrid (filesystem + Engram `sdd/inicio-home-section/archive`)

## Summary

Added a new "Inicio" home section as the platform's default landing page. Root `/` and bare `/dashboard` now redirect to `/dashboard/inicio` (previously `/dashboard/crypto`). Added a sidebar `InicioLink` sub-component and a new hand-drawn `Home` icon. Excluded the shared footer from the Inicio route via a Next.js route-group restructuring: `app/dashboard/(with-footer)/` now wraps `crypto/` and `[market]/`, while `app/dashboard/inicio/page.tsx` stays outside that group.

## Task Completion Gate

Read `tasks.md` at archive time: 14/15 tasks were checked (`[x]`), with task 4.1 ("merge `market-navigation`/`decision-dashboard` spec deltas") intentionally left unchecked. This is an explicit, documented repo convention — not a stale checkbox — confirmed by:
- `tasks.md` Phase 4 note: "Do NOT merge ... deltas during apply — defer to `sdd-archive` per repo convention."
- `apply-progress.md`: "Phase 4 (task 4.1) deliberately deferred to `sdd-archive` per repo convention — not part of this apply batch."
- `verify-report.md`: "Tasks incomplete | 1 (4.1, deferred to sdd-archive per convention)" and "Live specs untouched | Correct | ... matches this repo's convention that MODIFIED-requirement merges happen at sdd-archive, not sdd-apply."

Per the SKILL.md exceptional-reconciliation clause, this phase completed task 4.1 as its own deliverable (the spec merge below) and marked the archived `tasks.md` checkbox `[x]`, with an inline note pointing back to this report. This is not a stale-checkbox waiver — it is `sdd-archive` performing the task that was always scoped to it. 15/15 tasks complete at close.

## Native Review Receipt Gate

No `reviewGate` was present in structured status for this candidate (receipt-driven development kill switch was off / no review was started for this change). Archive proceeded under ordinary repository policy per the gate's documented "absent" branch — no receipt to validate.

## Specs Synced

| Domain | Requirement | Action | Detail |
|--------|-------------|--------|--------|
| `market-navigation` | Sidebar navigation shell | MODIFIED | Branding → Inicio link → market groups order; added "Inicio link renders between branding and market groups" scenario |
| `market-navigation` | Shared shell footer | MODIFIED | Carved out `/dashboard/inicio` exception; added "Inicio route renders no footer" scenario |
| `market-navigation` | Per-market routing | MODIFIED | Bare `/dashboard` and root `/` now land on Inicio (not directly on crypto); added "Root path lands on Inicio, never a 404" scenario, closing a previously-uncovered gap (root `/` had no prior requirement wording) |
| `decision-dashboard` | Crypto dashboard route under market navigation | MODIFIED | Bare `/dashboard` now lands on Inicio, not directly on the Tier 1 overview; scenario renamed "Bare /dashboard lands on Inicio, not the overview directly" with an added AND-clause proving the crypto route still works via CTA/sidebar |

All 4 requirements were merged with the requirement body copied in full plus a trailing `(Previously: ...)` line, per this repo's established MODIFIED-requirement merge convention (consistent with n8n-cadence-6h and other changes archived this session). Every other requirement in both main specs (`Placeholder-market page`, `Mobile navigation drawer`, `Sidebar accessibility baseline`, `No new third-party CDN/font dependency`, `Dashboard eyebrow copy...`, `Determinism disclaimer...` in `market-navigation`; `Card overview (Tier 1)`, `Tier 2 drill-down`, `LLM narrative and graph visualization confined to Tier 2`, `No-data UX...`, `Multi-asset display`, `Dual-needle gauge...`, `Card-grid breakpoints...`, `DirectionFilter wiring...`, `Crypto view heading...`, `Presentation-cache TTL...` in `decision-dashboard`) was preserved untouched.

Post-merge readback confirmed by full-file re-read of both `openspec/specs/market-navigation/spec.md` and `openspec/specs/decision-dashboard/spec.md` — all 4 MODIFIED requirements match the delta text exactly, all preserved requirements are intact.

## Verify Verdict (Final State)

**Verdict**: unconditional PASS. 0 CRITICAL, 0 WARNING, 2 non-blocking SUGGESTION.

Per `verify-report.md` (observation not applicable — read directly from filesystem `openspec/changes/inicio-home-section/verify-report.md` pre-move):
- `npx tsc --noEmit`: PASS, exit 0.
- `npx vitest run`: 37 files / 224 tests passed.
- `npx playwright test`: 44 passed.
- 15/15 scenarios COMPLIANT across both domains.
- SUGGESTION 1: the decision-dashboard scenario "Bare /dashboard lands on Inicio, not the overview directly" second AND-clause (CTA navigation from Inicio to crypto) is proven by aggregate evidence across multiple passing tests rather than one single connected Playwright test. Non-blocking, test-shape improvement only.
- SUGGESTION 2 (final-state correction, per this phase's launch-prompt final-state fact, which outranks the stale verify-report snapshot on this point): `verify-report.md` flagged two stale doc-comment path references (`app/(dashboard)/layout.tsx` line 5, `app/dashboard/(with-footer)/[market]/page.tsx` line 10) left over from the `crypto/page.tsx` move. Per the orchestrator's explicit final-state fact, these were fixed directly after verify ran, in `app/(dashboard)/layout.tsx`, `app/dashboard/(with-footer)/[market]/page.tsx`, and `app/dashboard/(with-footer)/crypto/page.tsx`. This SUGGESTION is now resolved; SUGGESTION 1 remains open and non-blocking.

Code, including the doc-comment fixes, is already committed and pushed to `main` at commit `e59a6e8` (per the launch prompt's explicit final-state fact — this phase performed no code commits itself, only the filesystem spec-merge and archive-folder move described above).

## Archive Contents

- `proposal.md` — present
- `design.md` — present
- `exploration.md` — present (carried over, not itself referenced by the SKILL.md's required-artifact list but part of the original change folder)
- `specs/market-navigation/spec.md`, `specs/decision-dashboard/spec.md` — present (delta specs, preserved as historical record)
- `tasks.md` — present, 15/15 complete at close (see Task Completion Gate above)
- `apply-progress.md` — present
- `verify-report.md` — present
- `archive-report.md` — this file (additive, did not exist in the pre-move source folder)

## Mechanical Copy Verification

Pre-move recursive snapshot taken via `cp -R` to a scratch directory, then `git mv openspec/changes/inicio-home-section openspec/changes/archive/2026-08-21-inicio-home-section`, then `diff -r` between the snapshot and the archived folder.

```
$ diff -r "$TEMP/sdd-archive-snap/source" "openspec/changes/archive/2026-08-21-inicio-home-section"
DIFF_EXIT=0
```

Empty diff — byte-identical move confirmed. Source directory confirmed gone (`openspec/changes/inicio-home-section` no longer exists) before the comparison ran.

Note: the `tasks.md` checkbox edit for task 4.1 (marking it `[x]` with a note) was applied to the archived copy AFTER this diff was taken, as the final step of completing task 4.1 itself — this is an intentional, in-scope archive-phase edit to the task-tracking artifact, not a violation of "never modify archived changes" (which governs post-archive drift, not the archive phase's own deliverable completion).

## Source of Truth Updated

- `openspec/specs/market-navigation/spec.md`
- `openspec/specs/decision-dashboard/spec.md`

Both now reflect Inicio as the platform's default landing page, the sidebar Inicio link, the footer exception, and the updated bare-`/dashboard`/root-`/` routing behavior.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. No CRITICAL or WARNING findings. One non-blocking SUGGESTION remains open (test-shape improvement for the CTA-flow scenario) — recorded here for visibility, not a blocker for any future work.

## Not Committed by This Phase

Per explicit instruction, this phase made only filesystem changes (spec merges in `openspec/specs/`, the `git mv` of the change folder to archive, and the `tasks.md` checkbox completion). It did not run `git commit` or `git push`. The application code (including the doc-comment fixes) was already committed/pushed separately as `e59a6e8`. The orchestrator is expected to commit the spec-merge and archive-move changes made by this phase.
