# Archive Report: narrative-market-param-regression

**Archived**: 2026-08-22
**Status**: Complete — PASS WITH WARNINGS (0 CRITICAL, 2 non-blocking WARNING, both explicitly accepted by the user), fully archived
**Code delivery**: Already committed and pushed to `main` prior to this archive phase — 2 commits: `d7efeba` (`fix(dashboard): restore narrative panel broken by missing market param`) and verify-gate commit `292026a` (`chore(sdd): close narrative-market-param-regression verify gate`). This phase performed no code commits, only the archive-folder filesystem move and this report.

## Summary

This change is a same-day regression hotfix, not new feature work. The just-archived `acciones-market-integration` change (commit `8ff3407`) made `GET /api/decisions/[asset]/narrative` require a `?market=crypto|acciones` query param, but never updated the browser-side caller — every narrative request, for both markets, 400'd with `BAD_MARKET` before reaching real logic, a total outage of the Tier 2 AI-narrative feature (reported by the user as "la narración dejó de funcionar").

1. **`market` threaded from `DrilldownPanel.tsx` into `NarrativePanel.tsx`** — `decision.market` (already present on the `Decision` type, already reaching `DrilldownPanel`) is now passed as a new `market: Market` prop and appended to the fetch URL (`?market=${market}`); zero new data fetching required.
2. **`BAD_MARKET` added to `UNAVAILABLE_CODES`** — a future recurrence of this failure mode now degrades to the calm "narrativa no disponible" state instead of an infinite "Reintentar" retry loop.
3. **3 `page.route` globs widened in `tests/e2e/dashboard.spec.ts`** (`stubNarrativeSuccess`, `stubNarrativeError`, and the new regression test) from `'**/api/decisions/*/narrative'` to `'**/api/decisions/*/narrative?**'`, mirroring the existing `stubDecisions` pattern fix from the sibling `acciones-market-integration` change — this is also why the outage shipped past a previously-green 52/52 e2e suite: the un-widened stubs intercepted every narrative request *before* the real handler could ever reject it on the missing query param, masking the bug from tests entirely.
4. **New RED→GREEN regression test added** (`dashboard.spec.ts:730`) asserting the narrative panel reaches `data-state="done"` with the correct market query param sent; widening the glob also reactivated 4 previously-latent assertions in existing tests (503/`NARRATIVE_DISABLED`, 409/`NOT_APPLICABLE`, a lazy-fetch counter, and 502/`UPSTREAM_ERROR`) that would have silently passed against the unfixed code for the same masking reason.
5. **No backend/API changes** — `app/api/decisions/[asset]/narrative/route.ts`, `tests/api/narrative.test.ts`, and `src/narrative/` were confirmed untouched (already correct; the contract itself was never wrong, only the caller).

## Task Completion

**13/13 tasks complete at archive time.** Confirmed via direct filesystem grep for `- [ ]` in the on-disk `openspec/changes/narrative-market-param-regression/tasks.md` immediately before this phase's archive-move work — zero matches (13/13 `- [x]`). This matches `verify-report.md`'s own completeness table (13 total / 13 complete / 0 incomplete).

**Note on Engram tasks snapshot**: the Engram `sdd/narrative-market-param-regression/tasks` observation (#1773, created at task-generation time, before apply) shows all 13 items as unchecked `- [ ]` — this is the pre-apply planning snapshot, never updated post-apply since this change ran in hybrid mode where the filesystem `tasks.md` is authoritative for completion state. No exceptional stale-checkbox reconciliation was needed for the actual gate check: the on-disk `tasks.md` (the source consulted per the Task Completion Gate for hybrid mode) already reflected 13/13 complete when this archive phase began, corroborated by `verify-report.md`'s independent completeness count. This discrepancy is recorded here per the Final-State Authority hierarchy, not silently resolved.

## Verify Verdict (per `verify-report.md`, Engram observation #1775)

**Verdict**: PASS WITH WARNINGS.

**CRITICAL**: 0
**WARNING**: 2, both non-blocking, coverage-breadth follow-ups (explicitly accepted by the user, not archive blockers):
1. Success Criterion 1 (dual-market load) is runtime-proven only for crypto — no e2e test opens an acciones asset's drilldown and asserts the narrative panel reaches `data-state="done"` with `market=acciones` sent. Static evidence (identical, market-agnostic prop-threading/template-literal fetch URL, `Market`-type-checked) makes an acciones-specific bug unlikely but not runtime-proven.
2. Success Criterion 3 (`BAD_MARKET` → calm "unavailable", no infinite retry) is runtime-proven only indirectly via the shared `UNAVAILABLE_CODES` mapping mechanism exercised by other codes — no test stubs an actual `BAD_MARKET` 400 response and asserts `data-state="unavailable"`.

**SUGGESTION**: 1, non-blocking — only 2 of 4 previously-latent-bug assertions reactivated by the glob widening were independently re-derived line-by-line during verification; the other 2 share the identical mechanism and were reasoned about, not separately traced.

**Build**: `npx tsc --noEmit` — PASSED, 0 errors (fresh run x2, identical both times).
**Tests**: 323/323 passed (270 Vitest across 41 files + 53 Playwright across 2 spec files), 0 failed, 0 skipped — both suites re-run fresh and independently twice during verification; results matched apply-progress's reported 270/270 and 53/53 exactly both times.
**Spec compliance**: N/A — no `spec.md`/`design.md` for this change (pure bugfix, no capability delta, per proposal). Supplementary informal Success Criteria compliance: 2/4 fully compliant, 2/4 partial (the 2 WARNINGs above; gaps are coverage-breadth, not incorrect-fix, findings).
**Scope check**: `git show d7efeba --stat` confirmed only `DrilldownPanel.tsx`, `NarrativePanel.tsx`, `tests/e2e/dashboard.spec.ts`, plus the 4 expected SDD artifact files under `openspec/changes/narrative-market-param-regression/` — nothing under `app/api/`, `src/narrative/`, or `tests/api/`. No scope creep.
**TDD compliance**: 6/6 checks passed (TDD evidence reported in apply-progress, all tasks have tests, RED confirmed via a real pre-fix run — 5 failures, all `data-state="failed"` from `BAD_MARKET` — GREEN confirmed via 2 independent fresh full-suite re-runs, triangulation adequate via 5 real regression cases spanning success/failure branches, safety net present — 18/18 baseline pre-edit run for the modified test file).

## Spec Sync — Skipped (No Delta Specs Exist)

**No spec-merge step was performed for this change**, and none was required. Confirmed by direct filesystem inspection of the change folder (`apply-progress.md`, `exploration.md`, `proposal.md`, `tasks.md`, `verify-report.md` only — no `spec.md` and no `specs/` subdirectory) prior to the archive move, and independently corroborated by the Engram artifact search returning no `sdd/narrative-market-param-regression/spec` or `.../design` observation.

This is a pure client-side bugfix restoring compliance with an already-correctly-specified route contract shipped by the already-archived `acciones-market-integration` change. `openspec/specs/decision-narrative/spec.md`'s "Narrative endpoint contract" requirement (merged during that prior change's archive) already accurately describes the required `market` query parameter and market-scoped cache lookup — that spec text was correct all along; only the browser-side caller was out of compliance with it. No requirement text needed to change, so `openspec/specs/decision-narrative/spec.md` is left exactly as-is by this archive.

## Mechanical Copy / Move Verification

Per the Mechanical Copy Contract, the archive folder move used `git mv` only; no artifact content passed through Read→Write.

**Archive folder move**: `git mv openspec/changes/narrative-market-param-regression openspec/changes/archive/2026-08-22-narrative-market-param-regression`, preceded by a recursive `cp -R` snapshot to a scratch directory for independent readback.

**`diff -r` readback (source snapshot vs. archived destination, archive-report.md excluded since it did not exist pre-move)**:
```
$ diff -r "$snapshot_root/source" "openspec/changes/archive/2026-08-22-narrative-market-param-regression"
(no output)
$ echo $?
0
```
Empty diff — byte-identical move confirmed. Source directory `openspec/changes/narrative-market-param-regression/` no longer exists (confirmed via `[ -e ... ] || [ -L ... ]` check before the diff, which found neither, and independently by a failed `ls` on the old path). Scratch snapshot removed after readback.

## Archive Contents

- `proposal.md` ✅
- `exploration.md` ✅
- `tasks.md` ✅ (13/13 tasks complete)
- `apply-progress.md` ✅
- `verify-report.md` ✅ (PASS WITH WARNINGS — 0 CRITICAL, 2 non-blocking WARNING)
- `archive-report.md` ✅ (this file, written during archive)
- No `design.md` and no `specs/` — none were produced for this change (pure bugfix, no capability delta, confirmed by direct filesystem inspection).

## Source of Truth Updated

None. No main spec required any edit — `openspec/specs/decision-narrative/spec.md`'s existing "Narrative endpoint contract" requirement was already accurate before this change and remains unchanged.

## Traceability — Engram Observation IDs Read

- `sdd/narrative-market-param-regression/proposal` — observation #1772
- `sdd/narrative-market-param-regression/tasks` — observation #1773
- `sdd/narrative-market-param-regression/verify-report` — observation #1775
- `sdd/narrative-market-param-regression/spec` — searched, not found (no spec delta exists for this change)
- `sdd/narrative-market-param-regression/design` — searched, not found (no design doc exists for this change)

(`exploration.md`, `apply-progress.md`, and the on-disk `tasks.md` were read/inspected directly from the filesystem, since this change's artifacts already existed on disk under hybrid mode; the on-disk `tasks.md` — not the stale pre-apply Engram snapshot — was the source consulted for the Task Completion Gate.)

## Native Review Receipt Gate

No `reviewGate` was reported for this candidate in the launch context (structurally absent — no populated value to check). Archive proceeded under ordinary repository policy, consistent with the gate's "kill switch off / no review ever started for this candidate" branch. No review transaction/ledger/receipt/gate-context topics were read, since none exist for this candidate.

## Risks / Open Items

None blocking archive. Carried forward for visibility only, per the user's explicit acceptance in the launch instructions:

1. The 2 non-blocking WARNINGs from `verify-report.md` — no acciones-specific narrative e2e assertion, and no direct `BAD_MARKET`-stub test — remain open as optional coverage-breadth follow-ups, not defects in the shipped fix. Both are static-evidence-backed as low-risk (the fix path is generically market-agnostic and type-checked), and the user has explicitly accepted them as non-blockers for this archive.
2. The proposal's own process lesson stands as a durable record for future task breakdowns: a backend query-param contract change (`acciones-market-integration`'s Phase C) shipped with 100% green tests while silently breaking every real request, because the task breakdown never included an "update all callers" task for the route change. Future contract-change task breakdowns should include that explicitly.

## SDD Cycle Complete

The change has been fully planned (proposal, tasks — no spec/design needed for a pure bugfix against an already-correct contract), implemented (1 commit landed on `main`: `d7efeba`), verified (`292026a` gate commit — PASS WITH WARNINGS, 0 CRITICAL, 2 non-blocking WARNING, 323/323 tests green, no scope creep), and archived (folder moved, byte-identical `diff -r` confirmed, no stale tasks found, no spec-merge needed or performed). Code was already committed and pushed to `main` prior to this archive phase. This phase's only filesystem change (the archive folder move, staged via `git mv`) is left for the orchestrator to review and commit separately.
