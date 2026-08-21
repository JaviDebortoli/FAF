# Archive Report: inicio-visual-and-scroll-fix

**Change**: inicio-visual-and-scroll-fix
**Archived**: 2026-08-21
**Archived to**: `openspec/changes/archive/2026-08-21-inicio-visual-and-scroll-fix/`
**Artifact store**: hybrid (Engram + filesystem)

## Summary

Two small, related UX fixes bundled as a single change:

1. Added a new static hand-drawn `PipelineDiagram` SVG component (Datos → Indicadores → Reglas → Recomendación) to `/dashboard/inicio`, filling the previously empty visual space between the info card and the CTA link.
2. Fixed a phantom vertical scrollbar on `/dashboard/crypto` and `/dashboard/{market}` on short-content routes, caused by `<main>`'s `min-h-screen` double-stacking with `(with-footer)/layout.tsx`'s `pb-48` (192px) clearance — always rendering ≥ `100vh + 192px` regardless of actual content. Fixed by replacing `min-h-screen` with `min-h-[calc(100vh-12rem)]` in both `<main>` elements, reusing the exact `12rem` literal already present in `pb-48` (not re-derived), plus cross-referencing comments documenting the coupling.

Code already committed and pushed to `main` as commit `26da5b3` prior to this archive phase.

## Artifacts Read (Engram observation IDs, for traceability)

| Artifact | Engram Observation ID | Topic Key |
|---|---|---|
| proposal | #1728 | `sdd/inicio-visual-and-scroll-fix/proposal` |
| exploration | (filesystem only — not persisted to Engram) | `openspec/changes/.../exploration.md` |
| tasks | #1729 | `sdd/inicio-visual-and-scroll-fix/tasks` |
| apply-progress | #1730 | `sdd/inicio-visual-and-scroll-fix/apply-progress` |
| verify-report | #1731 | `sdd/inicio-visual-and-scroll-fix/verify-report` |

Filesystem copies of all five artifacts (`proposal.md`, `exploration.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`) were read directly from `openspec/changes/inicio-visual-and-scroll-fix/` prior to the archive move, and are preserved unchanged in this archived folder (confirmed via the `diff -r` readback below).

## Spec/Design: Deliberately Skipped — Confirmed Appropriate

No `spec.md` and no `design.md` exist for this change, and none were created during archive. This is a deliberate, confirmed-appropriate omission, not a gap:

- Per `proposal.md`'s Capabilities section: "New: None. Modified: None — market-navigation spec's 'footer MUST NOT overlap content' requirement is preserved unchanged."
- Per `exploration.md`'s "Spec-conflict check": a repo-wide grep of `openspec/specs/` confirmed no spec anywhere pins `min-h-screen`/scroll behavior (implementation detail only), and nothing in specs conflicts with adding the pipeline diagram (purely additive, no spec references Inicio's exact visual content).
- Per `verify-report.md`: independently confirmed `git diff --stat -- openspec/specs/` returned empty output — no spec files were touched by this change.

**Consequence for this archive phase**: there is no delta spec directory (`openspec/changes/inicio-visual-and-scroll-fix/specs/`) and therefore **nothing to merge into `openspec/specs/*/spec.md`**. Step 2 (Sync Delta Specs) is a no-op for this change. This follows the exact same pattern as `graph-scrollbar-theming`, `gauge-arc-contrast`, `drilldown-graph-layout-fix`, and `dashboard-content-polish`, all archived earlier this session.

## Task Completion Gate

`tasks.md` (Engram #1729, filesystem-confirmed) shows **all 15/15 implementation tasks checked `[x]`** across 5 phases:

| Phase | Tasks | Status |
|---|---|---|
| 1 — Pipeline Diagram Component | 1.1–1.3 | `[x]` all 3 |
| 2 — Inicio Wiring | 2.1 | `[x]` |
| 3 — Phantom Scroll Fix (RED) | 3.1–3.3 | `[x]` all 3 |
| 4 — Phantom Scroll Fix (GREEN) | 4.1–4.5 | `[x]` all 5 |
| 5 — Verification | 5.1–5.5 | `[x]` all 5 |

No stale unchecked checkboxes. No exceptional reconciliation was needed.

## Verify Verdict (Final State)

**PASS — unconditional, 0 CRITICAL / 0 WARNING / 0 SUGGESTION.**

This is the cleanest verdict of any change archived this session (`graph-scrollbar-theming`, `gauge-arc-contrast`, `drilldown-graph-layout-fix`, and `dashboard-content-polish` each closed with at least a noted observation or non-zero item; this change closed with all three severity counts at zero).

Key points from `verify-report.md` (Engram #1731), all independently reproduced by `sdd-verify` rather than trusted from `apply-progress.md`:

- All 15/15 tasks confirmed to match the actual code state, not just trusted from progress notes.
- Full source inspection of `PipelineDiagram.tsx`, `inicio/page.tsx`, `crypto/page.tsx`, `[market]/page.tsx`, and `(with-footer)/layout.tsx` confirmed the described changes are genuinely present.
- **Independent RED → GREEN reproduction from scratch**, via `git stash push` scoped to only the two `<main>` className fix files: reverting to `min-h-screen` reproduced the exact failure signature (`Expected: <= 801, Received: 992`) reported in `apply-progress.md`; restoring the fix (`git stash pop`) reproduced the pass (3 passed: phantom-scroll test + both footer-overlap viewports). This confirms the new e2e test is a genuine regression guard for the double-count bug, not a coincidental pass.
- Full independent re-run: `npx tsc --noEmit` clean (exit 0); `npx vitest run` → 224 passed / 37 files (exit 0); `npx playwright test` full suite → 45 passed (exit 0). All match `apply-progress.md`'s claimed counts.
- All 4 success criteria from `proposal.md` confirmed met.
- One unrelated pre-existing working-tree observation noted (not a defect in this change, does not affect verdict): `n8n/faf-workflow.json` modified, outside this change's scope. Independently reconfirmed still present and unrelated at archive time (`git status --short` at archive time shows only `n8n/faf-workflow.json` modified plus untracked session-local directories `.agents/`, `.claude/`, `skills-lock.json`).

No CRITICAL, WARNING, or SUGGESTION items — no override or reconciliation of any kind was required for this archive.

## Native Review Receipt Gate

`reviewGate` was structurally absent for this candidate — no receipt-driven-development review artifact exists to read for `inicio-visual-and-scroll-fix`. Archive proceeds under ordinary repository policy, consistent with the gate's absent-case handling (kill switch off, or no review ever started for this candidate). No `sdd/inicio-visual-and-scroll-fix/review/*` topics exist or were read.

## Delivery Note

Code was already committed and pushed to `main` as commit `26da5b3` prior to this archive phase (per the orchestrator's launch context). This archive phase performed ONLY the filesystem move of the change folder — it did not create, amend, or push any git commit. The orchestrator is responsible for committing this archive-folder move (`git mv openspec/changes/inicio-visual-and-scroll-fix openspec/changes/archive/2026-08-21-inicio-visual-and-scroll-fix`) separately.

## Mechanical Move Verification

Move performed via `git mv openspec/changes/inicio-visual-and-scroll-fix openspec/changes/archive/2026-08-21-inicio-visual-and-scroll-fix` (shell only — no Read/Write round-trip of artifact content).

Pre-move recursive snapshot taken via `cp -R` to a temp directory, compared against the post-move archived folder via `diff -r`:

```
$ diff -r "$snapshot_root/source" "openspec/changes/archive/2026-08-21-inicio-visual-and-scroll-fix"
$ echo "DIFF_EXIT=$?"
DIFF_EXIT=0
```

Empty diff output, exit code 0 — byte-identical move confirmed. Source directory (`openspec/changes/inicio-visual-and-scroll-fix/`) confirmed absent after the move. This `archive-report.md` file is additive to the archived folder and was correctly excluded from the pre-move snapshot comparison (it did not exist in the source).

## Archive Contents

- `proposal.md` ✅
- `exploration.md` ✅
- `tasks.md` ✅ (15/15 tasks complete)
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file, added during archive)
- `design.md` — not applicable, deliberately skipped (see above)
- `specs/` — not applicable, no delta specs exist (see above)

## SDD Cycle Complete

The change has been fully proposed, explored, planned, implemented, verified (unconditional PASS), and archived. No spec merge was required. Ready for the next change.
