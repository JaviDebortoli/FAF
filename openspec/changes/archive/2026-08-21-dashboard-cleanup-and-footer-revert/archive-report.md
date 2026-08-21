# Archive Report: dashboard-cleanup-and-footer-revert

**Archived**: 2026-08-21
**Status**: Complete — unconditional PASS, fully archived
**Code delivery**: Already committed and pushed to `main` as commit `03713ac` (prior to this archive phase; this phase performed no code commits, only spec-merge + archive-folder filesystem operations)

## Summary

Three bundled dashboard fixes, all in scope, all implemented and verified:

1. **Punctuation fix** — Inicio's pipeline description rewritten to comma-separated-with-"y" phrasing, matching `PipelineDiagram.tsx`'s established convention.
2. **`ThesisScores.tsx` θ/gap removal** — Tier-2 `ThesisColumn` no longer renders θ or gap values (both Alcista/Bajista); `theta` dropped from props/destructure/call sites; `computeScores` destructure narrowed to `{ sigmaPlus, sigmaMinus }`. `DecisionCard.tsx`'s Tier-1 θ/gap display confirmed untouched (out of scope).
3. **Inicio footer-exclusion revert (atomic unit)** — `git mv app/dashboard/inicio/page.tsx` into `app/dashboard/(with-footer)/inicio/page.tsx`; mandatory companion `<main>` className fix (`min-h-screen` → `min-h-[calc(100vh-12rem)]`, byte-identical to `crypto/page.tsx`/`[market]/page.tsx`) to prevent phantom-scroll regression; 3 stale header comments rewritten; `market-navigation` spec delta; e2e test inversion/extension in `market-nav.spec.ts`.

No `design.md` was produced for this change — deliberately skipped per `proposal.md` (all three points fully resolved during `exploration.md` with no open design ambiguity; `exploration.md` + `proposal.md` substituted for design intent, and `sdd-verify` cross-checked implementation against them directly).

## Task Completion

**26/26 in-scope implementation tasks (Phases 1–6) were complete at apply time**, per `apply-progress.md` and independently confirmed by `sdd-verify`'s direct source inspection (not by trusting `apply-progress.md`'s claims alone).

**Task 7.1** ("Merge `market-navigation/spec.md`'s MODIFIED 'Shared shell footer' delta") was intentionally left unchecked through apply and verify, per this repo's established convention of deferring the delta-spec merge to `sdd-archive`. This is **not** a Task Completion Gate violation — `tasks.md` explicitly labeled it "deferred to `sdd-archive`, per repo convention" and both `apply-progress.md` and `verify-report.md` treat it as an intentional, non-blocking exclusion rather than an open gap. This phase (`sdd-archive`) completed task 7.1 by applying the delta spec verbatim to the live main spec (see Spec Sync below) and checked it off in the archived `tasks.md` before the folder move.

Final state: **27/27 tasks complete** at archive time.

## Verify Verdict (per `verify-report.md`, engram observation #1747)

**Verdict**: PASS (unconditional, eligible for archive)
**CRITICAL**: 0
**WARNING**: 0
**SUGGESTION**: 2 (both explicitly non-blocking test-coverage nice-to-haves, not functional or spec gaps):
  1. `market-nav.spec.ts:92` (old thesis-footer-copy-absence check) does not explicitly assert against `/dashboard/inicio`. Verify notes this is immaterial today since that string was never part of Inicio's content; adding Inicio would only make the universal-coverage spec intent more explicit in the test suite.
  2. No test asserts θ/gap are absent from `ThesisScores`'s rendered output. Point 2 had no spec delta and was correctly scoped as a GREEN-only mechanical edit; a negative assertion would add defense against silent reintroduction but is not required by this change's own scope.

**Build**: `npx tsc --noEmit` — PASSED, 0 errors.
**Tests**: 272/272 passed (224 Vitest + 48 Playwright), 0 failed, 0 skipped.
**Spec compliance**: 5/5 scenarios compliant against the delta's own "Shared shell footer" MODIFIED requirement (1 marked PARTIAL — the old-footer-copy-absence scenario doesn't explicitly re-check Inicio — but verify judged this immaterial, consistent with SUGGESTION 1 above; not a functional gap).

**Regression-proof**: `sdd-verify` independently reproduced apply's Phase-5 regression-proof (temporarily reverting only the `<main>` className fix on the moved Inicio page) and got a **matching failure signature**: `Expected: <= 1001, Received: 1192` at the 1280x1000 viewport, consistent with the `pb-48` double-count root cause `inicio-visual-and-scroll-fix` originally fixed on crypto. This independently confirms the new phantom-scroll regression test is a real guard, not tautological.

**Deviations reviewed and found sound** (2, both from `apply-progress.md`, independently re-verified by `sdd-verify`):
1. Phantom-scroll test viewport 1280x1000 instead of `tasks.md`'s suggested 1280x800 — necessary because Inicio's real content (~894px) is taller than crypto's `EmptyState`; an 800px viewport would show real, non-phantom scroll even with the fix correctly applied.
2. Only 2 of 3 Phase-3 RED tests failed pre-move (task 3.4) — sound, because pre-move Inicio sat outside `(with-footer)/` with no `pb-48` reservation, so the double-counting bug being guarded against did not exist yet on the unmoved route; Phase 5's explicit revert-and-reproduce is the real RED for that test.

## Spec Sync

**Domain**: `market-navigation`
**Main spec**: `openspec/specs/market-navigation/spec.md` (already existed)
**Delta spec source**: `openspec/changes/dashboard-cleanup-and-footer-revert/specs/market-navigation/spec.md` (1 MODIFIED requirement, applied verbatim as written by the delta — no reinterpretation)

| Requirement | Action | Details |
|---|---|---|
| Shared shell footer | MODIFIED | Reverted the Inicio footer exception entirely. Footer now renders on every `/dashboard/*` route, including `/dashboard/inicio`, with no exception. The `#### Scenario: Inicio route renders no footer` scenario was replaced with the inverted `#### Scenario: Footer renders with the same exact copy on the Inicio route`. The `(Previously: ...)` trailer was overwritten (per this repo's single-trailer convention) to record the immediately-prior state being reverted: *"the footer was shared across every `/dashboard/*` route except `/dashboard/inicio` (both `/dashboard/crypto` and every placeholder-market route); the Inicio route (`/dashboard/inicio`) MUST NOT render the `dashboard-footer` element at all."* |

All other requirements in `market-navigation/spec.md` (Sidebar navigation shell, Per-market routing, Placeholder-market page, Mobile navigation drawer, Sidebar accessibility baseline, No new third-party CDN/font dependency, Dashboard eyebrow copy consistency, Determinism disclaimer) were preserved unchanged — not touched by this change's delta.

## Mechanical Copy / Move Verification

Per the Mechanical Copy Contract, all filesystem operations used `git mv`/`cp -R` only — no artifact content passed through Read→Write.

**tasks.md checkbox update**: task 7.1 was checked off via a targeted `Edit` (single-line change, not a full-file copy) before the archive move, recording that the spec merge was completed by this phase.

**Archive folder move**: `git mv openspec/changes/dashboard-cleanup-and-footer-revert openspec/changes/archive/2026-08-21-dashboard-cleanup-and-footer-revert`, preceded by a recursive `cp -R` snapshot to a scratch directory for independent readback.

**`diff -r` readback (source snapshot vs. archived destination, archive-report.md excluded since it did not exist pre-move)**:
```
$ diff -r "$snapshot_root/source" "openspec/changes/archive/2026-08-21-dashboard-cleanup-and-footer-revert"
(no output)
$ echo $?
0
```
Empty diff — byte-identical move confirmed. Source directory `openspec/changes/dashboard-cleanup-and-footer-revert/` no longer exists.

**Main spec merge**: applied via targeted `Edit` (block replacement of the exact "Shared shell footer" requirement section, matched by heading), not a full-file copy — per the skill's MODIFIED-requirement merge workflow, which is a text-merge operation, not a mechanical file copy. The replacement text was copied verbatim from the delta spec's own final wording (read directly, not paraphrased).

## Archive Contents

- `proposal.md` ✅
- `exploration.md` ✅ (present in this change's artifact set; substituted for `design.md`)
- `specs/market-navigation/spec.md` ✅ (delta, now merged into main spec)
- `tasks.md` ✅ (27/27 tasks complete, including 7.1 checked during this phase)
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file, written during archive)

No `design.md` — deliberately skipped, recorded in `proposal.md`'s own text and confirmed by `verify-report.md`'s Coherence section.

## Source of Truth Updated

`openspec/specs/market-navigation/spec.md` now reflects universal footer coverage across all `/dashboard/*` routes, with no Inicio exception — the current, correct state after this revert.

## Traceability — Engram Observation IDs Read

- `sdd/dashboard-cleanup-and-footer-revert/proposal` — observation #1743
- `sdd/dashboard-cleanup-and-footer-revert/tasks` — observation #1745
- `sdd/dashboard-cleanup-and-footer-revert/verify-report` — observation #1747

(`exploration.md`, delta `specs/market-navigation/spec.md`, and `apply-progress.md` were read directly from the filesystem per explicit orchestrator instruction, since this change's artifacts already existed on disk under hybrid mode; their content is reproduced/summarized above for traceability.)

## Native Review Receipt Gate

No `reviewGate` was reported for this candidate in the launch context (structurally absent — no populated value to check). Archive proceeded under ordinary repository policy, consistent with the gate's "kill switch off / no review ever started for this candidate" branch. No review transaction/ledger/receipt/gate-context topics were read, since none exist for this candidate.

## Risks / Open Items

None blocking. The 2 verify SUGGESTIONs (additional Inicio-specific test coverage for old-footer-copy absence and θ/gap absence) remain open as optional future test-coverage hardening, not defects — carried forward here for visibility only, not as a blocker to this archive.

## SDD Cycle Complete

The change has been fully planned (proposal + exploration, design deliberately skipped), implemented (apply, 26/26 in-scope tasks), verified (unconditional PASS, 0 CRITICAL/0 WARNING), and archived (spec merged, folder moved, byte-identical `diff -r` confirmed). Code was already committed and pushed to `main` as `03713ac` prior to this archive phase. This phase's filesystem changes (spec merge in `openspec/specs/market-navigation/spec.md`, `tasks.md` checkbox, and the archive folder move) are uncommitted and left for the orchestrator to review and commit separately, per explicit instruction.
