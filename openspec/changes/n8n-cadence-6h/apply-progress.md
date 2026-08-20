# Apply Progress: Sync spec/docs/node-metadata to the manually-applied 6h n8n cadence

**Change**: n8n-cadence-6h
**Mode**: Standard (text/config-sync change, no application code — no RED/GREEN/REFACTOR cycle applies)

## Completed Tasks

### Phase 1: n8n Workflow Node Metadata
- [x] 1.1 `n8n/faf-workflow.json:152` — renamed `Schedule Trigger` node's `name` from `"Schedule Trigger (1hr)"` to `"Schedule Trigger (6h)"`.
- [x] 1.2 `n8n/faf-workflow.json:159` — replaced the `notes` field with design.md's exact `limit=50`-primary / idempotency-secondary text.
- [x] 1.3 `n8n/faf-workflow.json:208` — renamed the `connections` map key `"Schedule Trigger (1hr)"` to `"Schedule Trigger (6h)"`.
- [x] 1.4 Validated JSON parses successfully and `name`/`connections` key match exactly after 1.1-1.3.

### Phase 2: Docs and Comment Sync
- [x] 2.1 `docs/PRD.md:57` — cadence line corrected to "n8n con Schedule Trigger cada 6 horas."
- [x] 2.2 `docs/architecture-notes.md` (lines 3-36) — full "Cron cadence vs. candle-close" section replaced with design.md's coarser-than-candle reframing.
- [x] 2.3 `n8n/POST_IMPORT_STEPS.md:14` — ASCII pipeline diagram label corrected to `Schedule Trigger (6h)`.
- [x] 2.4 `tests/cycle/idempotency.test.ts` (lines 6-16) — stale comment block replaced with design.md's exact 6h-cadence text (comment only, no assertion change).

### Phase 3: Spec Delta (ownership note)
- N/A — no apply-phase action. `openspec/specs/semantic-ingestion/spec.md:24-25`'s MODIFIED "n8n scheduler-only role (D2)" requirement intentionally NOT touched here; it merges from `openspec/changes/n8n-cadence-6h/spec.md` during `sdd-archive`, per repo convention (`n8n-fetch-klines-item-fix` archive-report.md). Confirmed still reads "1-5 min" in the live main spec — this is the expected pre-archive state, not a missed edit.

### Phase 4: Verification
- [x] 4.1 `npx tsc --noEmit` — passed, zero output/errors.
- [x] 4.2 `npx vitest run tests/cycle/idempotency.test.ts` — 3/3 tests passed (42ms).
- [x] 4.3 Grepped live tree for stale cadence strings (`1-5 min`, `1-5min`, `2min`, `Schedule Trigger (1hr)`) across `n8n/`, `docs/`, `tests/` — zero unexpected hits. The only remaining live-tree matches are: (a) the 5 `openspec/changes/n8n-cadence-6h/*.md` planning artifacts themselves (historical "Previously:"/proposal prose, expected), and (b) `openspec/specs/semantic-ingestion/spec.md:25` (the pre-merge main spec, expected per Phase 3 note above — merges at `sdd-archive`).

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `n8n/faf-workflow.json` | Modified | Schedule Trigger node `name` renamed `(1hr)` → `(6h)`; `notes` rewritten with limit=50-primary / idempotency-secondary safety argument; `connections` map key renamed to match new node name |
| `docs/PRD.md` | Modified | Line 57 cadence corrected to "cada 6 horas" |
| `docs/architecture-notes.md` | Modified | "Cron cadence vs. candle-close" section (lines 3-36) fully reframed to coarser-than-candle / limit=50-primary argument |
| `n8n/POST_IMPORT_STEPS.md` | Modified | Line 14 ASCII diagram label corrected |
| `tests/cycle/idempotency.test.ts` | Modified | Lines 6-16 comment block corrected (no assertion changes) |
| `openspec/changes/n8n-cadence-6h/tasks.md` | Modified | Tasks 1.1-1.4, 2.1-2.4, 4.1-4.3 marked `[x]` |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx tsc --noEmit` → passed, no errors. `npx vitest run tests/cycle/idempotency.test.ts` → 3/3 tests passed (42ms). |
| Runtime harness command/scenario and exact result | N/A — no live n8n execution/scheduling harness exists in this repo (design.md Testing Strategy); this is the sole `[MANUAL-VERIFICATION-ONLY]` gap, tracked in Phase 5 below. |
| Rollback boundary | `git checkout -- n8n/faf-workflow.json docs/PRD.md docs/architecture-notes.md n8n/POST_IMPORT_STEPS.md tests/cycle/idempotency.test.ts` reverts all 5 changed files. The `spec.md` delta merge (owned by `sdd-archive`) is a separate, independently revertible step and was not touched here. |

## Deviations from Design

None — implementation matches design.md's exact drafted text for all 5 file edits.

## Issues Found

None.

## Remaining Tasks

- [ ] **Phase 5, task 5.1 — `[MANUAL-VERIFICATION-ONLY]`, intentionally left OPEN and UNCHECKED.** Live 6h Schedule Trigger firing correctly in production across at least one full 6h interval. NOT automatable — no live n8n execution/scheduling harness exists in this repo. Per this project's manual-verification-gate norm (established in `n8n-fetch-klines-item-fix`), `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS without the user's explicit confirmation of a real production 6h cycle. **`sdd-verify`: do not mistake this for a completed/skippable item — it stays open by design.**

## Workload / PR Boundary

- Mode: single PR (per tasks.md Review Workload Forecast — Low risk, ~90-110 changed lines, no chaining needed)
- Current work unit: Unit 1 — sync n8n JSON + 4 docs/comment files to the live 6h cadence
- Boundary: This apply batch covers all of Phase 1, 2, and 4. Phase 3 is explicitly out of scope (owned by `sdd-archive`). Phase 5.1 is explicitly out of scope for automated completion (user confirmation required).
- Estimated review budget impact: well under the 400-line budget; single PR is appropriate.

## Status

12/13 automatable tasks complete (Phases 1, 2, 4 — 11 tasks — plus Phase 3's "no action" note). 1 task (5.1) intentionally remains open pending user's live production confirmation, per the manual-verification-gate norm. Ready for `sdd-verify`.
