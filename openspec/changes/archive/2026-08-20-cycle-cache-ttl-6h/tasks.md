# Tasks: Raise the presentation-cache TTL to match the 6h n8n cadence

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~20-25 (1 constant value + doc-comment rewrite in `constants.ts`) |
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
| 1 | Raise `BETA_MS` to 8h + rewrite its doc comment in `src/cycle/constants.ts` | PR 1 | `npx vitest run tests/narrative/cache.test.ts tests/api/decisions.test.ts` | N/A — no live multi-hour n8n execution/scheduling harness exists in this repo (design.md Testing Strategy); manual production confirmation is the separate gated task 4.1 | `git checkout -- src/cycle/constants.ts` reverts the sole changed file; `openspec/specs/decision-dashboard/spec.md` delta merge (owned by sdd-archive) is a separate, independently revertible step |

## Phase 1: Implementation (GREEN-only — no RED task)

Strict TDD note: no existing test pins the literal `60 * 60 * 1000` value — every test referencing
`BETA_MS` does so relatively (design.md, exploration confirmed). There is no failing assertion to
write RED for; inventing one would test a false claim. This phase is GREEN-only; Phase 2 empirically
confirms the zero-test-edit claim instead of assuming it.

- [x] 1.1 `src/cycle/constants.ts` (lines 1-7) — change `BETA_MS` from `60 * 60 * 1000` to
  `8 * 60 * 60 * 1000` and replace the doc comment with design.md's exact provided text (drops the
  misleading Cuadro 1 β framing; documents the real purpose — presentation-cache TTL consumed by
  `app/api/cycle/route.ts`'s `cache.put(report, BETA_MS)` and `src/narrative/cache.ts`'s default
  `ttlMs` param — and the 8h-over-7h margin rationale).

## Phase 2: Verification

- [x] 2.1 Run `npx tsc --noEmit` — confirm zero type errors from the constant/comment edit.
- [x] 2.2 Run the full `npx vitest run` suite — confirm 100% pass with zero test edits; explicitly
  check `tests/narrative/cache.test.ts` and `tests/api/decisions.test.ts` stay green (flagged by
  exploration as the two files most TTL-adjacent).
- [x] 2.3 Grep sweep: confirm no other file hardcodes the old `60 * 60 * 1000` / `3600000` / "1 hour"
  literal tied to this constant's presentation-cache-TTL purpose. Do NOT touch unrelated 1h references
  elsewhere in the codebase (e.g. n8n's `Fetch Klines` node `interval: "1h"` candle setting, which is
  structurally unrelated).

## Phase 3: Spec Delta (ownership note)

- Note: `openspec/specs/decision-dashboard/spec.md`'s ADDED "Presentation-cache TTL survives the n8n
  inter-run gap" requirement merges from `openspec/changes/cycle-cache-ttl-6h/specs/decision-dashboard/spec.md`
  **during `sdd-archive`, not `sdd-apply`** — per this repo's established convention (`n8n-cadence-6h`
  tasks.md Phase 3, `narrative-model-haiku` tasks.md Phase 3). No apply-phase action here; do not
  hand-merge the live spec early.

## Phase 4: Manual Verification Handoff (do NOT check off during sdd-apply)

- [x] 4.1 **[MANUAL-VERIFICATION-ONLY]** Live production confirmation: user loads the dashboard at
  various points across a normal, live, unattended 6h n8n inter-run window (including near the end
  of the window) and confirms "Servicio momentáneamente no disponible" no longer appears solely due
  to presentation-cache TTL expiry. Not automatable — no live multi-hour n8n execution/scheduling
  harness exists in this repo (design.md Testing Strategy). Per this project's manual-verification-gate
  norm (established in `n8n-cadence-6h` task 5.1, `narrative-model-haiku` task 5.1), this item MUST
  stay unchecked and open until the user explicitly confirms; `sdd-verify`/`sdd-archive` MUST NOT mark
  this change PASS without that confirmation.
  **CONFIRMED 2026-08-20**: User stated verbatim (Spanish): "Ya confirmé, cierra el SDD" (= "I already
  confirmed, close the SDD"), relayed to `sdd-archive` in the orchestrator's launch prompt as an
  explicit final-state fact — a live confirmation given directly to the orchestrator after
  `sdd-verify` had already persisted its report. Reconciled exceptionally at archive time per the
  same pattern used to close `narrative-model-haiku` task 5.1 and `n8n-cadence-6h` task 5.1.
