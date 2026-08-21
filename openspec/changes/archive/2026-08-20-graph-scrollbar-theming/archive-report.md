# Archive Report: graph-scrollbar-theming

## Change Summary

Fixed two visual-polish/accessibility defects reported by the user from screenshots:

1. **Graph edge contrast** — Argument-graph edge `<line>` elements in `app/(dashboard)/components/ArgumentGraph.tsx` were nearly invisible (~1.17:1 contrast, relying on inherited `currentColor`/`text-zinc-700`), below the WCAG 1.4.11 floor of 3:1 for non-text graphics. Fixed by giving edges an explicit `className="stroke-zinc-200"` and raising `opacity` from `0.35` to `0.5`, independently recomputed at ~4.42–4.45:1 contrast (~3.8x improvement).
2. **Global scrollbar theming** — All 3 scrollable containers app-wide (drill-down panel, desktop sidebar, mobile drawer) rendered unstyled browser-default scrollbars, clashing with the dark dashboard chrome. Fixed with one global CSS rule in `app/globals.css` (`scrollbar-color`/`scrollbar-width: thin` + `::-webkit-scrollbar*` fallback), scoped via `html` so it cascades to all `overflow-y-auto` containers with zero per-component edits.

Both fixes are already committed and pushed to `main` as commit `cede7aa` (`fix(dashboard): improve argument graph edge contrast and scrollbar theming`), confirmed via `git log`.

## Spec/Design Artifacts

**No `spec.md`, `design.md`, or `specs/` directory exist for this change — this was deliberate, not an omission.** `proposal.md`'s "Modified Capabilities" section states: "None — no pinned color/contrast requirement exists in `decision-dashboard/spec.md` or `decision-narrative/spec.md`; this is implementation-level, not spec-level." This is the same pattern used earlier in this session for `drilldown-graph-layout-fix`, confirmed appropriate for a pure visual-polish/CSS/SVG-attribute fix with no capability or spec-level impact.

**Consequence**: there is nothing to merge into `openspec/specs/*/spec.md`. Step 2 (Sync Delta Specs) of the archive skill was a no-op for this change.

## Task Completion

All 6 tasks in `tasks.md` are checked complete:

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | `ArgumentGraph.tsx` edge `<line>`: add `className="stroke-zinc-200"` | [x] |
| 1.2 | Same `<line>` elements: `opacity={0.35}` → `opacity={0.5}` | [x] |
| 1.3 | `app/globals.css`: global scrollbar theming rule + webkit fallback | [x] |
| 2.1 | `npx tsc --noEmit` — no type errors | [x] |
| 2.2 | Full `npx playwright test` suite — zero regressions | [x] |
| 2.3 | Manual visual confirmation (dev-environment screenshot check) | [x] |

No stale-checkbox reconciliation was needed — `apply-progress.md` and `verify-report.md` independently corroborate all 6 tasks complete, with `verify-report.md` explicitly stating each was "independently confirmed complete via direct source inspection, not taken on apply-progress.md's word."

## Verification Verdict — PASS WITH WARNINGS (not unconditional PASS)

`verify-report.md`'s own explicit verdict is **PASS WITH WARNINGS**, not an unconditional PASS. Quoting its closing judgment directly: *"this does not warrant unconditional PASS-and-archive treatment identical to drilldown-graph-layout-fix... the proposal's own literal success criterion names three browsers, and only one was ever empirically exercised - that gap should be surfaced to the user before archive rather than silently absorbed into an unconditional PASS."*

- **CRITICAL findings**: 0 (none — no override needed, no gate blocked).
- **Blockers**: 0.
- **Build**: `npx tsc --noEmit` — PASSED, independently re-run, exit 0.
- **Tests**: `npx playwright test` — PASSED, 39/39, independently re-run.
- **Source verification**: both changed files independently re-read and confirmed byte-exact to spec (edge `stroke-zinc-200`/`opacity={0.5}`, conflict node untouched; scrollbar CSS present with correct `zinc-700`/`zinc-900` tones and webkit fallback).
- **Contrast math**: independently recomputed via WCAG relative-luminance formula at ~4.42:1 (within 0.7% of exploration.md's claimed 4.45:1 — rounding-method difference only), clearing the 3:1 floor.

### WARNING 1 — Cross-browser scope gap (non-blocking)
Proposal's Success Criteria explicitly named 3 browsers ("Chrome, Firefox, and Safari"). All empirical evidence (both apply-time and independent verify-time) used **Chromium only** — no Firefox or Safari runtime confirmation exists anywhere in the trail. `scrollbar-color`/`scrollbar-width` are standard CSS properties with broad Firefox support and Safari 26.2+ support per `exploration.md`; failure mode on unsupported/untested browsers is graceful degradation to the default browser scrollbar, not breakage. The literal success criterion as written is therefore not fully evidenced.

### WARNING 2 — No TDD-cycle test evidence (pre-documented exception, non-blocking)
No "TDD Cycle Evidence" table exists in `apply-progress.md`, despite Strict TDD being the active global convention. This is a **documented, pre-approved exception**, not a silent protocol deviation: `tasks.md`'s own Phase 1 header states "GREEN-only — no meaningful RED test for subjective color/scrollbar styling; no existing test asserts these, no visual-regression tooling exists," independently corroborated by `verify-report.md`'s own test-file grep (no new/modified test files exist for this change) and by `exploration.md`'s Test-Impact Catalog.

### SUGGESTION — Out-of-scope contrast finding, not actioned
`verify-report.md`'s independent contrast audit swept adjacent `currentColor` consumers and found `ScoreGauge.tsx:27`'s gauge arc-track shares the same low-contrast `currentColor` pattern this change fixed for graph edges (composited ~`#27272a` @ full opacity over `#09090b`, contrast **~1.34:1**, below the WCAG 3:1 floor for non-text graphics). This is **explicitly out of scope** for `graph-scrollbar-theming` — `proposal.md` scoped the contrast fix to graph edge line elements only, and `exploration.md`'s Affected Areas list does not include `ScoreGauge.tsx`. The gauge's information-bearing needles (`var(--color-buy)`/`var(--color-sell)`) are unaffected and already well above 3:1; only the decorative-adjacent arc track shows the defect shape.

**Recorded here as a suggested future backlog item, not actioned in this change**: a future, separately-scoped visual-polish pass should evaluate whether `ScoreGauge.tsx`'s arc track is "required to understand" the gauge (per WCAG 1.4.11) versus purely decorative structure around the fully-contrasted needles, and fix accordingly if so.

## User Disclosure and Decision

Per the orchestrator's launch context, **both non-blocking warnings were explicitly surfaced to the user** before this archive ran (the cross-browser gap and the pre-documented TDD-exception note), and the user **explicitly chose to archive now rather than test additional browsers first**. This is recorded per the archive skill's Strict-vs-OpenSpec Archive Policy: "If the user explicitly approves a non-critical partial archive... record the exact reason in the archive report and mark the archive as intentional-with-warnings." This archive is intentional-with-warnings, not an unconditional clean PASS — a future reader should not interpret this closure as full 3-browser empirical confirmation.

## Files Changed (already committed/pushed — not touched by this archive phase)

| File | Action |
|------|--------|
| `app/(dashboard)/components/ArgumentGraph.tsx` | Modified — edge `<line>`: `stroke="currentColor"` → `className="stroke-zinc-200"`; `opacity` 0.35 → 0.5 |
| `app/globals.css` | Modified — added global scrollbar theming block after the `body` rule |

Commit: `cede7aa` — `fix(dashboard): improve argument graph edge contrast and scrollbar theming` (already on `main`; confirmed via `git log --oneline`).

## Archive Mechanics

- **Source**: `openspec/changes/graph-scrollbar-theming/`
- **Destination**: `openspec/changes/archive/2026-08-20-graph-scrollbar-theming/`
- **Method**: pre-move recursive snapshot to a temp directory, `git mv` of the full change folder, then mandatory `diff -r` readback of the pre-move snapshot against the archived destination.
- **Readback result**: source directory confirmed gone post-move; `diff -r` produced **empty output** (byte-identical). See verbatim output in the phase result below.
- **Artifacts archived**: `proposal.md`, `exploration.md`, `tasks.md`, `apply-progress.md`, `verify-report.md` (no `spec.md`/`design.md`/`specs/` — deliberately absent, see above). `archive-report.md` (this file) is additive, written only at the destination.

## Engram Persistence

This report is also persisted to Engram under topic key `sdd/graph-scrollbar-theming/archive-report` (project: `faf`), per hybrid artifact-store mode.

## SDD Cycle Complete

The change has been fully planned (proposal + exploration), implemented (apply), verified (verify — PASS WITH WARNINGS, disclosed and accepted by the user), and archived. No spec/design merge was required. Ready for the next change.
