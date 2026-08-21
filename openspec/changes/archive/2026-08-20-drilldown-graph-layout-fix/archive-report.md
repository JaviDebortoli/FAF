# Archive Report: drilldown-graph-layout-fix

**Change**: drilldown-graph-layout-fix
**Archived**: 2026-08-20
**Archived to**: `openspec/changes/archive/2026-08-20-drilldown-graph-layout-fix/`
**Artifact store**: hybrid (Engram topic `sdd/drilldown-graph-layout-fix/archive` + this filesystem report)
**Code fix status**: already committed and pushed to `main` as commit `a7a18e9` — this phase performed no code changes, only artifact-folder archival.

## Summary

Fixed a production bug where the drill-down panel's argument graph (rules R1-R8 converging to σ+/σ-) visually compressed toward zero height and disappeared while the LLM narrative streamed in below it. Root cause (single confirmed mechanism, source-verified, no ambiguity): a classic CSS Flexbox `min-height: auto` trap. `ArgumentGraph`'s root `<svg>` carries a UA-stylesheet default `overflow: hidden`, which resolves its automatic flex-item min-height to `0`, while its `flex-col` siblings (`ThesisScores`'s `<dl>`, `NarrativePanel`'s `<section>`) keep a content-based (non-zero) automatic minimum via default `overflow: visible`. As the streamed narrative grew past `max-h-[90vh]`, all negative free space landed on the only flex item with a zero floor — the SVG graph — squeezing it toward near-zero height.

**Fix**: added Tailwind's `shrink-0` utility to all three flex-item roots in `DrilldownPanel.tsx`'s `flex-col` layout:
- `ArgumentGraph.tsx:40` (root `<svg>`) — the actual fix site.
- `ThesisScores.tsx:19` (root `<dl>`) — defensive hardening.
- `NarrativePanel.tsx:117` (root `<section>`) — defensive hardening.

Plus one new e2e regression test (`tests/e2e/dashboard.spec.ts`) using a chunked/streaming narrative route stub (`stubNarrativeStreaming`) that polls graph-node bounding-box height *during* the stream, not only before/after — closing the coverage gap that let the original bug ship.

## Artifacts Present / Absent

| Artifact | Status | Notes |
|----------|--------|-------|
| `proposal.md` | Present | Full scope, approach, risks, rollback plan |
| `exploration.md` | Present | Source-confirmed single-mechanism root cause |
| `spec.md` / delta specs | **Deliberately absent** | See "Spec Delta / Merge" below |
| `design.md` | **Deliberately absent** | Pure bugfix — no architecture/design-surface decisions beyond a 3-line Tailwind class fix |
| `tasks.md` | Present | 10/10 tasks checked (`[x]`) |
| `apply-progress.md` | Present | Intermediate snapshot; header line has a cosmetic count discrepancy (see below) |
| `verify-report.md` | Present | Verdict: PASS, 0 CRITICAL, 1 cosmetic WARNING, 0 SUGGESTION |

## Spec Delta / Merge — Explicitly None

No `spec.md`, `design.md`, or `specs/{domain}/` delta directory exists in the source change folder, and none was expected. This is confirmed intentional by two independent sources, not an omission:

- **`proposal.md`** ("Capabilities" section): "No spec-level requirement changes — `decision-dashboard` and `decision-narrative` already require the graph to render and to survive narrative *failure*; layout behavior during concurrent streaming was never a pinned requirement, so this is a pure bugfix, not a behavior change." The "Approach" section further records the explicit decision not to add a spec delta scenario, reasoning that the new e2e test already pins the regression at the test layer and a formal spec requirement would be disproportionate scope for a 3-line CSS fix.
- **`verify-report.md`** (independent re-review): confirms this reasoning is "reasonable on independent review" and that spec/design dimensions were skipped "per the Graceful Artifact Handling degraded-mode rule, not treated as missing-and-required."

Consequently, **Step 2 (Sync Delta Specs to Main Specs) had nothing to merge.** `openspec/specs/decision-dashboard/spec.md` and `openspec/specs/decision-narrative/spec.md` are unchanged by this archive — no requirements were added, modified, removed, or renamed. This is recorded explicitly per this phase's instructions, not silently skipped.

## Task Completion Gate

`tasks.md` (source, pre-move) showed all 10 implementation tasks checked (`[x]`): 1.1, 1.2, 1.3 (Phase 1 — RED), 2.1, 2.2, 2.3, 2.4 (Phase 2 — GREEN), 3.1, 3.2, 3.3 (Phase 3 — Verification). Zero unchecked tasks. Gate passes; no reconciliation needed.

## Known Discrepancy (non-blocking, verify-classified WARNING)

`apply-progress.md`'s header states "9/9 tasks complete," but both its own "Completed Tasks" checklist and `tasks.md`'s checkboxes enumerate exactly **10** items. This is a counting error in the summary line only — every one of the 10 tasks is checked and evidenced with command output; no task is actually missing. `verify-report.md` independently identified and classified this as a cosmetic **WARNING**, not CRITICAL, and it does not affect actual completeness. Per this phase's Final-State Authority rules, this discrepancy is recorded here for the audit trail rather than silently corrected or treated as a blocker.

## Verification Summary (from `verify-report.md`, highest available authoritative source for this cycle)

- **Verdict**: PASS
- **Blockers / CRITICAL findings**: 0
- **WARNING**: 1 (the cosmetic 9/9-vs-10 header miscount above)
- **SUGGESTION**: 0
- **Build**: `npx tsc --noEmit` — exit 0, zero type errors (independently re-run by verify)
- **Tests — focused**: `npx playwright test tests/e2e/dashboard.spec.ts` — 13/13 passed (independently re-run)
- **Tests — full suite**: `npx playwright test` — 39/39 passed (independently re-run)
- **RED→GREEN independent reproduction**: verify performed its own `git stash push --keep-index` revert of only the 3 component files, re-ran the new test against unfixed source (confirmed FAIL — `graph-node-R4` collapsed to 2.36px during streaming, `data-state: streaming`), then restored the fix via `git stash pop` and re-ran (confirmed PASS). This independently proves the new e2e test is a genuine regression guard tied to the actual fix mechanism, not a tautological or flaky pass.
- **Missed-file check**: `DrilldownPanel.tsx`'s flex-col container has 4 direct children, not 3 — the header div was correctly left untouched because it is an ordinary block element with default `overflow: visible` and is structurally immune to this bug class (unlike the SVG's UA-default `overflow: hidden`). No sibling was missed.
- **No `[MANUAL-VERIFICATION-ONLY]` gate applies.** Unlike several other changes archived this session, the proposal explicitly determined the automated e2e test is sufficient proof (no live production dependency), and verify's independent from-scratch RED→GREEN reproduction corroborates that determination. Archive-readiness for this change is **unconditional** — there is no standing manual verification gate blocking or qualifying this archive.

## Native Review Receipt Gate

`reviewGate` was structurally absent in structured status for this candidate (no review artifact was discovered for this change) — receipt-driven development review either was off or no review was ever started for this candidate. Per the Native Review Receipt Gate, this is not a defect and does not block archive; the change proceeds under ordinary repository policy. No `sdd/{change-name}/review/{transaction,ledger,receipt,gate-context}` topics exist to read, and none were read.

## Mechanical Archive Move — Verification

- Source: `openspec/changes/drilldown-graph-layout-fix/` (5 files: `proposal.md`, `exploration.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`)
- Destination: `openspec/changes/archive/2026-08-20-drilldown-graph-layout-fix/`
- Method: recursive `cp -R` to a temp snapshot, then `git mv` of the tracked change folder, then `diff -r` readback of the pre-move snapshot against the archived destination (this `archive-report.md` file is additive and was excluded — it did not exist in the source).
- Result: `diff -r` produced **zero output** (exit clean) — byte-identical move confirmed. Verbatim transcript:

```
$ diff -r "$snapshot_root/source" "openspec/changes/archive/2026-08-20-drilldown-graph-layout-fix"
DIFF_EMPTY_PASS
```

(No differences were reported; `DIFF_EMPTY_PASS` was printed only because the preceding `diff -r` exited 0.)

- Post-move confirmation: `openspec/changes/drilldown-graph-layout-fix/` no longer exists (`SOURCE_GONE_OK`); the archived folder contains exactly the 5 original artifact files plus this additive `archive-report.md`.

## Not Performed By This Phase

- No `git commit` or `git push` was made. The folder move (`git mv`) is staged in the working tree only; the orchestrator will review and commit separately per instructions.
- No code changes were made — the `shrink-0` fix and new e2e test were already committed and pushed as `a7a18e9` prior to this archive phase.

## Traceability

This report was written directly from filesystem artifacts (per orchestrator instruction: read `proposal.md`, `exploration.md`, `tasks.md`, `apply-progress.md`, `verify-report.md` under `openspec/changes/drilldown-graph-layout-fix/` — not via `mem_search`/`mem_get_observation`, since this repo's SDD artifacts for this change were filesystem-native rather than Engram-native). The archive report itself is additionally persisted to Engram under topic `sdd/drilldown-graph-layout-fix/archive` per the hybrid artifact-store instruction.

### SDD Cycle Complete
The change has been fully planned (proposal + exploration), implemented (TDD RED→GREEN), independently verified (unconditional PASS, no manual gate), and archived. Ready for the next change.
