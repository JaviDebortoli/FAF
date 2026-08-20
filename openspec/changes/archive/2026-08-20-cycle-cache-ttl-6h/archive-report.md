# Archive Report: Raise the Presentation-Cache TTL to Match the 6h n8n Cadence

**Change**: cycle-cache-ttl-6h
**Date**: 2026-08-20
**Status**: ARCHIVED
**Verdict**: PASS (fully verified, including live production confirmation)

---

## What Changed

Production dashboard intermittently showed "Servicio momentáneamente no disponible" and only recovered
when n8n was manually re-triggered. Root cause: the presentation-cache TTL (`BETA_MS`,
`src/cycle/constants.ts:7`, consumed by `src/cycle/latest.ts`'s in-memory cache) was still `1h`, left
over from before `n8n-cadence-6h` moved n8n's polling interval to `6h`. The cache expired 1h after every
push, leaving a ~5h dead window every cycle where `GET /api/decisions` returned 503 and the narrative
route returned 404 — no stale data existed to fall back on.

- `src/cycle/constants.ts`: `BETA_MS` changed from `60 * 60 * 1000` (1h) to `8 * 60 * 60 * 1000` (8h) —
  6h n8n cadence + ~33% safety margin. Doc comment rewritten: dropped the misleading reference to the
  paper's Cuadro 1 β (an unrelated dimensionless candle-count), documented the real purpose and the
  8h-over-7h margin rationale.
- No consumer code change needed: `app/api/cycle/route.ts:131`'s `cache.put(report, BETA_MS)` and
  `src/narrative/cache.ts:46`'s default `ttlMs: Millis = BETA_MS` parameter both reference the constant,
  not a literal, so both inherit the new value automatically.
- No test edits: every test referencing `BETA_MS` does so relatively (`BETA_MS - 1`, `BETA_MS`), never
  the literal 1h value — confirmed independently by both `sdd-apply` and `sdd-verify`.
- `openspec/specs/decision-dashboard/spec.md`: ADDED one `[MANUAL-VERIFICATION-ONLY]` requirement/
  scenario ("Presentation-cache TTL survives the n8n inter-run gap") gating this change from archiving
  PASS until a human confirmed live in production that the dead-window symptom no longer occurs — same
  pattern as `n8n-cadence-6h`'s live-schedule gate and `narrative-model-haiku`'s live-quality gate.

**Code delivery**: Already committed and pushed to `main` as commit `a0f1c82` prior to this archive
phase. This archive phase performs documentation/spec-closure only — no code was re-applied or
re-committed here.

---

## Final-State Authority Note

Per this repo's Final-State Authority hierarchy, this report reflects state AT CLOSE, not the state
recorded in the intermediate `verify-report` snapshot (Engram #1693, written 2026-08-20). That snapshot
correctly recorded task 4.1 as open at verification time — it could not have recorded otherwise, since
the user's confirmation was given after verification ran. The explicit final-state fact below (the
user's live confirmation, relayed in this archive phase's launch prompt) outranks that snapshot's
"open"/"BLOCKED-ON-MANUAL-VERIFICATION" claim per rank-3 of the hierarchy, and closes the gate.

---

## Verification Summary

**Verdict**: PASS — structurally correct AND confirmed live by user

| Metric | Value |
|--------|-------|
| Critical findings | 0 |
| Warnings | 0 |
| Suggestions | 0 |
| Automatable tasks complete | 4/4 (1.1, 2.1, 2.2, 2.3) |
| Manual verification scenarios | 1/1 CONFIRMED (live production execution, confirmed by user) |
| `npx tsc --noEmit` | exit 0, zero errors (independently re-run at verify time) |
| `npx vitest run` (full suite) | 37/37 files, 224/224 tests passed |
| `npx vitest run tests/narrative/cache.test.ts tests/api/decisions.test.ts` | 8 + 3 = 11/11 passed |
| Grep sweep (hardcoded TTL literal) | None found tied to `BETA_MS`'s purpose — independently re-confirmed at verify time with fresh patterns |

**Live manual verification (CONFIRMED by user, 2026-08-20)**: The user stated, verbatim (Spanish):
"Ya confirmé, cierra el SDD" (= "I already confirmed, close the SDD"), relayed to `sdd-archive` in the
orchestrator's launch prompt as an explicit final-state fact. This satisfies the `[MANUAL-VERIFICATION-ONLY]`
scenario's GIVEN/WHEN/THEN — the user confirmed live in production that "Servicio momentáneamente no
disponible" no longer occurs during a normal 6h n8n inter-run window.

**Process rule applied** (established by `n8n-fetch-klines-item-fix`, reused by `n8n-cadence-6h` and
`narrative-model-haiku`): This change has one `[MANUAL-VERIFICATION-ONLY]` scenario. Per this project's
manual-verification-gate norm, `sdd-verify`/`sdd-archive` MUST NOT mark such a change PASS until the
user explicitly confirms live. This change exemplifies the rule working correctly — the user provided
direct confirmation. Verdict upgraded from the intermediate "PASS WITH WARNINGS / BLOCKED-ON-MANUAL-VERIFICATION"
(per verify-report, Engram #1693) to **PASS**.

---

## Task Completion Gate — Exceptional Reconciliation

Task 4.1 in `tasks.md` was `[ ]` (unchecked) at both `apply` and `verify` time — correctly so, since the
manual confirmation had not yet been given. Per this archive phase's explicit orchestrator instruction
and the user's live confirmation (an explicit final-state fact from the launch prompt, not a prompt-only
assertion of a fixed CRITICAL — no CRITICAL/WARNING/SUGGESTION issues exist in this change to begin
with), task 4.1 was marked `[x]` in `tasks.md` with the exact confirmation quote and date recorded
inline, before the archive move. This is the same exceptional-reconciliation pattern used to close
`narrative-model-haiku` task 5.1 and `n8n-cadence-6h` task 5.1.

**Reconciliation reason recorded**: Task 4.1 is a `[MANUAL-VERIFICATION-ONLY]` scenario that by design
cannot be completed by `sdd-apply` or `sdd-verify` — only a live user confirmation closes it. The user
gave that confirmation directly to the orchestrator after `sdd-verify` had already run and persisted its
report. No other unchecked task existed; all 4 automatable tasks were already correctly checked at
apply/verify time (Phase 3's spec-delta merge note is not a checkbox task — it explicitly defers the
merge to `sdd-archive`, performed in this phase).

---

## Delta Spec Merged into Main Specs

**Domain**: `decision-dashboard`

**Action**: MERGED (ADDED requirement appended to existing main spec)

**Added requirement in** `openspec/specs/decision-dashboard/spec.md`:
- **Presentation-cache TTL survives the n8n inter-run gap** — ADDED, appended after the existing
  "Crypto view heading reflects market catalog label" requirement (the last requirement in the file).
  Scenario text merged verbatim from the delta
  (`openspec/changes/cycle-cache-ttl-6h/specs/decision-dashboard/spec.md`), unmodified — the
  `[MANUAL-VERIFICATION-ONLY]` tag and scenario wording are preserved as-is per this repo's established
  convention (`narrative-model-haiku`'s merged manual-verification scenario is also left verbatim
  post-confirmation; the confirmation status itself is recorded only in this archive-report.md and
  verify-report.md, not by editing the scenario's GIVEN/WHEN/THEN text).

**Pre-existing requirements preserved** (all 9, unmodified):
1. Card overview (Tier 1)
2. Tier 2 drill-down
3. LLM narrative and graph visualization confined to Tier 2
4. No-data UX (cache-miss empty state)
5. Multi-asset display
6. Crypto dashboard route under market navigation
7. Dual-needle gauge survives the navigation redesign
8. Card-grid breakpoints unchanged by the navigation redesign
9. DirectionFilter wiring unchanged by the navigation redesign
10. Crypto view heading reflects market catalog label

**Merge diff** (additive-only, confirmed via `git diff --stat`): `openspec/specs/decision-dashboard/spec.md`
— 19 insertions, 0 deletions.

---

## Mechanical Copy Contract — Verification Evidence

### Archive folder move

```
git mv openspec/changes/cycle-cache-ttl-6h openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h
```

Source directory confirmed gone after move (`SOURCE_GONE_OK`).

**Verbatim `diff -r` readback** (pre-move recursive snapshot vs. archived folder):

```
$ diff -r "<snapshot_root>/source" openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h
DIFF_EMPTY_PASS
```

Empty diff — byte-identical move confirmed. No content passed through model Read/Write; `git mv` was
the sole copy mechanism.

### Spec merge

The delta requirement was appended to the existing main spec via a direct text edit (not a full-file
mechanical copy — the Mechanical Copy Contract's shell-copy requirement applies to the "main spec does
not exist" case and to archive-folder moves; this was a "main spec exists, merge a delta" case, handled
per Step 2's merge algorithm). The merged text is byte-for-byte identical to the delta's ADDED
requirement in
`openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h/specs/decision-dashboard/spec.md` (verified by
direct comparison during authoring, confirmed via `git diff` above — 19 insertions, 0 deletions, no
existing lines altered).

---

## Files Changed by This Archive Phase

| File | Action |
|------|--------|
| `openspec/changes/cycle-cache-ttl-6h/tasks.md` → `openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h/tasks.md` | Task 4.1 marked `[x]` with confirmation quote/date, then moved to archive |
| `openspec/specs/decision-dashboard/spec.md` | ADDED requirement merged in (19 insertions, 0 deletions) |
| `openspec/changes/cycle-cache-ttl-6h/` → `openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h/` | Moved via `git mv`, diff-verified byte-identical |
| `openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h/archive-report.md` | Created (this file) |

**Not touched by this archive phase** (already committed/pushed prior to archive, per orchestrator
instruction): `src/cycle/constants.ts` (commit `a0f1c82`).

**Not committed by this archive phase**: per explicit orchestrator instruction, this phase made
filesystem changes only. Committing the archive-move + spec-merge is left to the orchestrator, as a
commit separate from the already-pushed code commit `a0f1c82`.

---

## Artifacts Archived

| File | Status |
|------|--------|
| proposal.md | ✅ Archived |
| exploration.md | ✅ Archived |
| design.md | ✅ Archived |
| specs/decision-dashboard/spec.md (delta) | ✅ Archived |
| tasks.md | ✅ Archived (5/5 checkbox tasks complete, including 4.1 reconciled at archive time) |
| apply-progress.md | ✅ Archived |
| verify-report.md | ✅ Archived (verdict at verify time: PASS WITH WARNINGS / blocked-on-manual-verification, 0 CRITICAL/WARNING/SUGGESTION; upgraded to PASS by this archive report per live confirmation) |
| archive-report.md | ✅ Created (this file) |

---

## Engram Artifact Observation IDs

For traceability, all SDD artifacts related to this change in Engram:

| Artifact | Type | Observation ID |
|----------|------|-----------------|
| sdd/cycle-cache-ttl-6h/proposal | architecture | 1688 |
| sdd/cycle-cache-ttl-6h/spec | architecture | 1689 |
| sdd/cycle-cache-ttl-6h/design | architecture | 1690 |
| sdd/cycle-cache-ttl-6h/tasks | architecture | 1691 |
| sdd/cycle-cache-ttl-6h/apply-progress | architecture | 1692 |
| sdd/cycle-cache-ttl-6h/verify-report | architecture | 1693 |
| sdd/cycle-cache-ttl-6h/archive-report | architecture | (created during this phase) |

---

## Final State

✅ **Native Review Receipt Gate**: No review was started for this candidate (`reviewGate` structurally
absent); proceed under ordinary repository policy.

✅ **Task Completion Gate**: All 5 checkbox tasks in `tasks.md` are `[x]`. Task 4.1 was reconciled
exceptionally at archive time per explicit orchestrator instruction and the user's live confirmation;
reconciliation reason recorded above.

✅ **Manual Verification Gate**: The one `[MANUAL-VERIFICATION-ONLY]` scenario is CONFIRMED by user
("Ya confirmé, cierra el SDD", quoted above). Fully PASS verdict is valid.

✅ **CRITICAL issues**: None (0 CRITICAL/WARNING/SUGGESTION in verify-report, independently re-run:
tsc clean, 224/224 tests passing).

✅ **Delta spec merged**: ADDED requirement merged into `openspec/specs/decision-dashboard/spec.md`;
all 10 pre-existing requirements preserved unmodified; spec is now authoritative.

✅ **Change folder moved to archive**: `openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h/`,
diff-verified byte-identical against pre-move snapshot.

✅ **Archive report written**: Filesystem + Engram `sdd/cycle-cache-ttl-6h/archive-report`.

⚠️ **Not committed**: Filesystem changes only, per explicit orchestrator instruction — the orchestrator
will review and commit separately from code commit `a0f1c82`.

---

**SDD Cycle Complete**. Change fully verified (automated) and confirmed (manual, live production), fully
archived. Code already live on `main`.
