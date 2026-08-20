# Tasks: Sync spec/docs/node-metadata to the manually-applied 6h n8n cadence

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~90-110 (1 JSON node edit + 1 connections-key rename + 4 doc/comment edits) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Sync `n8n/faf-workflow.json` node name/notes/connections-key + 4 docs/comment files to the live 6h cadence | PR 1 | `npx tsc --noEmit && npx vitest run tests/cycle/idempotency.test.ts` | N/A — no live n8n execution harness exists in this repo (design.md Testing Strategy) | `git checkout -- n8n/faf-workflow.json docs/PRD.md docs/architecture-notes.md n8n/POST_IMPORT_STEPS.md tests/cycle/idempotency.test.ts` reverts all 5 files; spec.md delta merge (owned by sdd-archive) is a separate, independently revertible step |

## Phase 1: n8n Workflow Node Metadata

- [x] 1.1 `n8n/faf-workflow.json:152` — rename `Schedule Trigger` node's `name` from `"Schedule Trigger (1hr)"` to `"Schedule Trigger (6h)"`.
- [x] 1.2 `n8n/faf-workflow.json:159` — replace the `notes` field with design.md's exact `limit=50`-primary / idempotency-secondary text.
- [x] 1.3 `n8n/faf-workflow.json:208` — rename the `connections` map key `"Schedule Trigger (1hr)"` to `"Schedule Trigger (6h)"` (n8n resolves edges by node name; skipping this silently breaks the Schedule Trigger -> Symbols edge).
- [x] 1.4 Validate: `node -e "JSON.parse(require('fs').readFileSync('n8n/faf-workflow.json','utf8'))"` succeeds after 1.1-1.3.

## Phase 2: Docs and Comment Sync

- [x] 2.1 `docs/PRD.md:57` — replace "n8n con Schedule Trigger cada 1-5 minutos" with "n8n con Schedule Trigger cada 6 horas" per design.md.
- [x] 2.2 `docs/architecture-notes.md` (lines 3-36) — replace the entire "Cron cadence vs. candle-close" section with design.md's coarser-than-candle reframing (`limit=50` primary, idempotency secondary backstop).
- [x] 2.3 `n8n/POST_IMPORT_STEPS.md:14` — change the ASCII pipeline diagram's `Schedule Trigger (1-5min)` label to `Schedule Trigger (6h)`.
- [x] 2.4 `tests/cycle/idempotency.test.ts` (lines 6-16) — replace the stale comment block with design.md's exact 6h-cadence text (comment only, no assertion change).

## Phase 3: Spec Delta (ownership note)

- Note: `openspec/specs/semantic-ingestion/spec.md:24-25`'s MODIFIED "n8n scheduler-only role (D2)" requirement merges from `openspec/changes/n8n-cadence-6h/spec.md` **during `sdd-archive`, not `sdd-apply`** — per this repo's established convention (`n8n-fetch-klines-item-fix` archive-report.md, "Delta Spec Merged into Main Specs"). No apply-phase action here; do not hand-merge the live spec early.

## Phase 4: Verification

- [x] 4.1 Run `npx tsc --noEmit` — confirm the comment-only edit in `tests/cycle/idempotency.test.ts` introduced no type error.
- [x] 4.2 Run `npx vitest run tests/cycle/idempotency.test.ts` — confirm the suite is still green (no assertion changed).
- [x] 4.3 Grep the live (non-archived) tree for stale cadence strings: `1-5 min`, `1-5min`, `2min`, `Schedule Trigger (1hr)` outside `openspec/changes/archive/` and `openspec/changes/n8n-cadence-6h/` (delta text there is historical "Previously:" prose, expected) — confirm zero unexpected hits across `n8n/`, `docs/`, `tests/`.

## Phase 5: Manual Verification Handoff (do NOT check off during sdd-apply)

- [x] 5.1 **[MANUAL-VERIFICATION-ONLY]** Live 6h schedule fires correctly in production: the imported workflow runs unattended across at least one full 6h interval in the user's live n8n instance and completes a cycle. **CONFIRMED by user, 2026-08-20**, verbatim (Spanish): "Ya confirmé el ciclo de 6hs, cierra el SDD" (= "I already confirmed the 6h cycle, close the SDD"). This satisfies the scenario's GIVEN/WHEN/THEN — a full 6h interval fired and completed a cycle in the user's live n8n instance.
