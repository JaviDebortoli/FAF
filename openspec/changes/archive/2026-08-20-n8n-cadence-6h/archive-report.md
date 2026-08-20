# Archive Report: Sync spec/docs/node-metadata to the manually-applied 6h n8n cadence

**Change**: n8n-cadence-6h
**Date**: 2026-08-20
**Status**: ARCHIVED
**Verdict**: PASS (fully verified, including live production confirmation)

---

## What Changed

The user manually changed the `Schedule Trigger` node in n8n Cloud from a 2-minute interval to a
6-hour interval (`active: false → true`) to cut execution volume and reduce budget spend — that
decision was already made and live in production. This change was a mechanical consistency sync
bringing the repo's spec, docs, and node metadata into agreement with the already-live config
(not a re-decision of the cadence):

- `n8n/faf-workflow.json`: `Schedule Trigger` node `name` renamed `"Schedule Trigger (1hr)"` →
  `"Schedule Trigger (6h)"`; `notes` field rewritten to lead with the `limit=50`-covers-the-gap
  safety argument (primary) and `runCycle` idempotency (secondary backstop); `connections` map key
  renamed to match the new node name (n8n resolves edges by node name).
- `docs/PRD.md:57`: cadence line corrected to "cada 6 horas".
- `docs/architecture-notes.md`: "Cron cadence vs. candle-close" section (lines 3-36) fully
  reframed from the old "cadence finer than candle" argument (now factually backwards at 6h) to
  the coarser-than-candle / `limit=50`-primary argument.
- `n8n/POST_IMPORT_STEPS.md:14`: ASCII pipeline diagram label corrected to `Schedule Trigger (6h)`.
- `tests/cycle/idempotency.test.ts` (lines 6-16): stale comment block replaced with the 6h-cadence
  rationale (comment only — no assertion changed).
- `openspec/specs/semantic-ingestion/spec.md`: MODIFIED "n8n scheduler-only role (D2)" requirement
  merged during this archive phase (see below).

**Code/doc delivery**: Already committed and pushed to `main` as commit `443b647` prior to this
archive phase. This archive phase performs the delta-spec merge and archive-folder move only — no
code or doc files were re-applied or re-committed here.

---

## Final-State Authority Note

Per this repo's Final-State Authority hierarchy, this report reflects state AT CLOSE, not the state
recorded in the intermediate `verify-report` snapshot (Engram #1677, written 2026-08-20 11:16:47).
That snapshot correctly recorded task 5.1 / the manual-verification scenario as open at verification
time — it could not have recorded otherwise, since the user's confirmation was given after
verification ran. The explicit final-state fact below (the user's live confirmation, relayed in this
archive phase's launch prompt) outranks that snapshot's "BLOCKED-ON-MANUAL-VERIFICATION" claim per
rank-3 of the hierarchy, and closes the gate.

---

## Verification Summary

**Verdict**: PASS — structurally correct AND confirmed live by user

| Metric | Value |
|--------|-------|
| Critical findings | 0 |
| Warnings (non-blocking, accepted-risk) | 2 (see below) |
| Automatable tasks complete | 11/11 (1.1-1.4, 2.1-2.4, 4.1-4.3), independently re-confirmed by `sdd-verify` |
| Manual verification scenarios | 1/1 CONFIRMED (live production 6h cycle, confirmed by user) |
| `npx tsc --noEmit` (re-run at verify time) | exit clean, zero errors/output |
| `npx vitest run tests/cycle/idempotency.test.ts` (re-run at verify time) | 3/3 passed, 41ms |
| Stale cadence-string grep (`1-5 min`, `1-5min`, `2min`, `Schedule Trigger (1hr)`) | zero unexpected hits in the live source tree (`n8n/`, `docs/`, `tests/`) |

**Live manual verification (CONFIRMED by user, 2026-08-20)**: The user confirmed, verbatim
(Spanish): "Ya confirmé el ciclo de 6hs, cierra el SDD" (= "I already confirmed the 6h cycle, close
the SDD"). This satisfies the `[MANUAL-VERIFICATION-ONLY]` scenario's GIVEN/WHEN/THEN — the imported
workflow ran unattended across at least one full 6h interval in the user's live n8n instance and
completed a cycle.

**Process rule applied** (Engram id 1544, established by `n8n-fetch-klines-item-fix`, reused by
`narrative-model-haiku` and this change): This change has one `[MANUAL-VERIFICATION-ONLY]` scenario.
Per this project's manual-verification-gate norm, `sdd-verify`/`sdd-archive` MUST NOT mark such a
change PASS until the user explicitly confirms live. Verdict upgraded from the intermediate
"PASS WITH WARNINGS / BLOCKED-ON-MANUAL-VERIFICATION" (per verify-report, Engram #1677) to **PASS**.

**Non-blocking WARNINGs carried forward from verify-report** (accepted design tradeoff, not a gap
introduced by archive):
1. The "Schedule Trigger is configured for exactly 6h" and "limit=50 fetch window covers the 6h gap"
   scenarios have no automated runtime test — compliance is established by static source inspection
   only. This is `design.md`'s explicit, documented decision ("No automated cadence-value check"),
   separately flagged in `proposal.md`'s Risks table as a known recurring-drift risk (the node name
   drifted once before this change). Left as a future-work note, not a task here.

---

## Task Completion Gate — Exceptional Reconciliation

Task 5.1 in `tasks.md` was `[ ]` (unchecked) at both `apply` and `verify` time — correctly so, since
the manual confirmation had not yet been given. Per this archive phase's explicit orchestrator
instruction and the user's live confirmation (an explicit final-state fact from the launch prompt,
not a prompt-only assertion of a fixed CRITICAL — no CRITICAL issues exist in this change to begin
with), task 5.1 was marked `[x]` in `tasks.md` with the exact confirmation quote and date recorded
inline, before the archive move. This is the same exceptional-reconciliation pattern used to close
`n8n-fetch-klines-item-fix`'s and `narrative-model-haiku`'s manual-verification gates.

**Reconciliation reason recorded**: Task 5.1 is a `[MANUAL-VERIFICATION-ONLY]` scenario that by
design cannot be completed by `sdd-apply` or `sdd-verify` — only a live user confirmation closes it.
The user gave that confirmation directly to the orchestrator after `sdd-verify` had already run and
persisted its report. No other unchecked task existed; all 11 automatable tasks were already
correctly checked at apply/verify time, plus Phase 3's "note only, no action" item.

---

## Delta Spec Merged into Main Specs

**Domain**: `semantic-ingestion`

**Action**: MERGED (requirement MODIFIED, copied in full with a trailing `(Previously: ...)` line —
same convention established and confirmed in `n8n-fetch-klines-item-fix`'s archive-report.md)

**Modified requirement in** `openspec/specs/semantic-ingestion/spec.md`:
- **n8n scheduler-only role (D2)**: cadence pinned from a vague "1-5 min" range to the exact
  configured `6h` value; safety rationale reframed from "cadence finer than the 1h candle (idempotency
  absorbs overlap)" to "cadence coarser than the candle (`limit=50` fetch window covers the ~6-candle
  gap per cycle, ~44-candle margin; idempotency is now the secondary backstop)"; two new
  source-verified scenarios added ("Schedule Trigger is configured for exactly 6h",
  "limit=50 fetch window covers the 6h gap"); the `[MANUAL-VERIFICATION-ONLY]` scenario is retained
  verbatim from the delta and marked **CONFIRMED** with the user's quote/date, per this repo's
  established convention (the confirmation status is recorded in the scenario title and an inline
  confirmation line, not by silently rewriting the GIVEN/WHEN/THEN — same pattern as
  `narrative-model-haiku`'s archive).

**Pre-existing requirements preserved** (all 8 others, unmodified):
1. Market-data fetch contract
2. OHLCV to RDF price-event mapping
3. Indicator value RDF mapping
4. POST /api/cycle symbol validation contract
5. Push-only asset ingestion
6. n8n symbol-list-driven single-pipeline fan-out
7. n8n partial-fetch resilience
8. n8n shared-secret credential handling

**Merge diff** (confirmed via `git diff --stat`): `openspec/specs/semantic-ingestion/spec.md` —
25 insertions, 2 deletions.

---

## Mechanical Copy Contract — Verification Evidence

### Archive folder move

```
git mv openspec/changes/n8n-cadence-6h openspec/changes/archive/2026-08-20-n8n-cadence-6h
```

Source directory confirmed gone after move (`SOURCE_GONE_OK`).

**Verbatim `diff -r` readback** (pre-move recursive snapshot vs. archived folder):

```
$ diff -r "<snapshot_root>/source" openspec/changes/archive/2026-08-20-n8n-cadence-6h
DIFF_EMPTY_PASS
```

Empty diff — byte-identical move confirmed. No content passed through model Read/Write; `git mv` was
the sole copy mechanism. (Task 5.1's checkbox edit and confirmation note were applied to `tasks.md`
via `Edit` *before* the snapshot was taken, so both the snapshot and the archived copy already
contain the reconciled `tasks.md` — the diff validates the move itself, not the reconciliation.)

### Spec merge

The MODIFIED requirement was merged into the existing main spec via a direct text edit (not a
full-file mechanical copy — the Mechanical Copy Contract's shell-copy requirement applies to the
"main spec does not exist" case and to archive-folder moves; this was a "main spec exists, merge a
delta" case, handled per Step 2's merge algorithm). The merged text is byte-for-byte identical to the
delta's MODIFIED requirement in
`openspec/changes/archive/2026-08-20-n8n-cadence-6h/spec.md`, plus the inline `CONFIRMED` note and
date added per the user's live confirmation (verified by direct comparison during authoring).

---

## Files Changed by This Archive Phase

| File | Action |
|------|--------|
| `openspec/changes/n8n-cadence-6h/tasks.md` | Task 5.1 marked `[x]` with confirmation quote/date |
| `openspec/changes/n8n-cadence-6h/` → `openspec/changes/archive/2026-08-20-n8n-cadence-6h/` | Moved via `git mv`, diff-verified byte-identical |
| `openspec/specs/semantic-ingestion/spec.md` | MODIFIED requirement merged in (25 insertions, 2 deletions) |
| `openspec/changes/archive/2026-08-20-n8n-cadence-6h/archive-report.md` | Created (this file) |

**Not touched by this archive phase** (already committed/pushed prior to archive, per orchestrator
instruction): `n8n/faf-workflow.json`, `docs/PRD.md`, `docs/architecture-notes.md`,
`n8n/POST_IMPORT_STEPS.md`, `tests/cycle/idempotency.test.ts` (commit `443b647`).

**Not committed by this archive phase**: per explicit orchestrator instruction, this phase made
filesystem changes only. Committing the archive-move + spec-merge is left to the orchestrator, as a
commit separate from the already-pushed code commit `443b647`.

---

## Artifacts Archived

| File | Status |
|------|--------|
| proposal.md | ✅ Archived |
| exploration.md | ✅ Archived |
| design.md | ✅ Archived |
| spec.md (delta) | ✅ Archived |
| tasks.md | ✅ Archived (12/12 items complete — 11 automatable tasks + Phase 3's "note only, no action" — plus task 5.1 reconciled at archive time) |
| apply-progress.md | ✅ Archived |
| verify-report.md | ✅ Archived (verdict at verify time: PASS WITH WARNINGS / BLOCKED-ON-MANUAL-VERIFICATION, 0 CRITICAL; upgraded to PASS by this archive report per live confirmation) |
| archive-report.md | ✅ Created (this file) |

---

## Engram Artifact Observation IDs

For traceability, all SDD artifacts related to this change in Engram:

| Artifact | Type | Observation ID |
|----------|------|-----------------|
| sdd/n8n-cadence-6h/proposal | architecture | 1672 |
| sdd/n8n-cadence-6h/spec | architecture | 1673 |
| sdd/n8n-cadence-6h/design | architecture | 1674 |
| sdd/n8n-cadence-6h/tasks | architecture | 1675 |
| sdd/n8n-cadence-6h/verify-report | architecture | 1677 |
| sdd/n8n-cadence-6h/archive-report | architecture | (created during this phase) |

---

## Final State

✅ **Native Review Receipt Gate**: No review was started for this candidate (`reviewGate`
structurally absent); proceed under ordinary repository policy.

✅ **Task Completion Gate**: All items in `tasks.md` are `[x]`. Task 5.1 was reconciled exceptionally
at archive time per explicit orchestrator instruction and the user's live confirmation; reconciliation
reason recorded above.

✅ **Manual Verification Gate**: The one `[MANUAL-VERIFICATION-ONLY]` scenario is CONFIRMED by user
(live production confirmation, quoted above). Fully PASS verdict is valid.

✅ **CRITICAL issues**: None (0 CRITICAL in verify-report; 2 non-blocking WARNINGs are an accepted,
documented design tradeoff, not implementation gaps).

✅ **Delta spec merged**: MODIFIED requirement merged into
`openspec/specs/semantic-ingestion/spec.md`, copied in full with a trailing `(Previously: ...)` line;
all 8 other pre-existing requirements preserved unmodified; spec is now authoritative.

✅ **Change folder moved to archive**: `openspec/changes/archive/2026-08-20-n8n-cadence-6h/`,
diff-verified byte-identical against pre-move snapshot.

✅ **Archive report written**: Filesystem + Engram `sdd/n8n-cadence-6h/archive-report`.

⚠️ **Not committed**: Filesystem changes only, per explicit orchestrator instruction — the
orchestrator will review and commit separately from code commit `443b647`.

---

**SDD Cycle Complete**. Change fully verified (automated) and confirmed (manual, live production),
fully archived. Code already live on `main`.
