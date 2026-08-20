# Apply Progress: Raise the presentation-cache TTL to match the 6h n8n cadence

**Change**: cycle-cache-ttl-6h
**Mode**: Standard (no RED/GREEN cycle — per tasks.md's explicit rationale: no existing test pins
the literal `60 * 60 * 1000` value; every test referencing `BETA_MS` does so relatively)

## Completed Tasks

- [x] 1.1 `src/cycle/constants.ts` — `BETA_MS` changed from `60 * 60 * 1000` to `8 * 60 * 60 * 1000`;
  doc comment rewritten to design.md's exact provided text (drops the misleading "paper Cuadro 1"
  framing, documents the real purpose and the 8h-over-7h margin rationale).
- [x] 2.1 `npx tsc --noEmit` — zero type errors.
- [x] 2.2 Full `npx vitest run` suite — 37 test files, 224 tests, all passed. `tests/narrative/cache.test.ts`
  (8 tests) and `tests/api/decisions.test.ts` (3 tests) confirmed green, unchanged.
- [x] 2.3 Grep sweep for hardcoded `60 * 60 * 1000` / `3600000` / `3_600_000` tied to this constant's
  purpose — none found. All other `3_600_000` hits are unrelated candle/RSI-window timestamp fixtures
  in `tests/stream/window.test.ts`, `tests/stream/evidence.test.ts`, `tests/rdf/mapCandles.test.ts`,
  `tests/e2e/dashboard.spec.ts` (structurally unrelated per design.md's stream-windowing distinction).
  n8n's `Fetch Klines` `interval: "1h"` candle setting was left untouched as instructed — different
  concept, no relation to `BETA_MS`.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `src/cycle/constants.ts` | Modified | `BETA_MS` value 1h → 8h (`60 * 60 * 1000` → `8 * 60 * 60 * 1000`); doc comment rewritten per design.md's exact provided text |

## Files Deliberately Untouched (per scope)

- `app/api/cycle/route.ts` — consumer of `BETA_MS`, inherits new value automatically, no edit needed.
- `src/narrative/cache.ts` — default `ttlMs` param stays coupled via `= BETA_MS`, inherits new value
  automatically, no edit needed.
- `openspec/specs/decision-dashboard/spec.md` — the ADDED-requirement merge from
  `openspec/changes/cycle-cache-ttl-6h/specs/decision-dashboard/spec.md` happens at `sdd-archive`
  time, per this repo's established convention (`n8n-cadence-6h`, `narrative-model-haiku` precedent).
  Not hand-merged early.

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/narrative/cache.test.ts tests/api/decisions.test.ts` — both green (confirmed as part of the full-suite run below); 8 + 3 = 11 tests passed |
| Full-suite command and exact result | `npx vitest run` → 37 test files passed, 224 tests passed, 0 failed |
| Type-check command and exact result | `npx tsc --noEmit` → 0 errors |
| Runtime harness command/scenario and exact result | N/A — no live multi-hour n8n execution/scheduling harness exists in this repo (design.md Testing Strategy); the real-world scenario is gated behind manual production confirmation (task 4.1, see below) |
| Rollback boundary | `git checkout -- src/cycle/constants.ts` reverts the sole changed file. The `openspec/specs/decision-dashboard/spec.md` delta merge (owned by `sdd-archive`) is a separate, independently revertible step not yet performed. |

## TDD Cycle Evidence

Not applicable. Per tasks.md Phase 1 explicit rationale: "no existing test pins the literal
`60 * 60 * 1000` value — every test referencing `BETA_MS` does so relatively... There is no failing
assertion to write RED for; inventing one would test a false claim." This phase is GREEN-only by
design; Phase 2 (tasks 2.1-2.3) empirically confirmed the zero-test-edit claim rather than assuming it.

## Deviations from Design

None — implementation matches design.md's exact provided replacement text for lines 1-7 of
`src/cycle/constants.ts` verbatim.

## Issues Found

None.

## Remaining Tasks (NOT completed — intentionally left open)

- [ ] Phase 3 (spec delta merge) — explicitly deferred to `sdd-archive` per repo convention; no
  apply-phase action required.
- [ ] **4.1 [MANUAL-VERIFICATION-ONLY]** — Live production confirmation that "Servicio momentáneamente
  no disponible" no longer appears during a normal, live, unattended 6h n8n inter-run window (including
  near the end of the window), solely due to presentation-cache TTL expiry. **This task MUST remain
  unchecked** until the user explicitly confirms this live. Per this project's established
  manual-verification-gate norm (`n8n-cadence-6h` task 5.1, `narrative-model-haiku` task 5.1),
  `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS without that confirmation. This is a
  standing gate, not a defect in this apply batch.

## Workload / PR Boundary

- Mode: single PR (Chain strategy: pending per tasks.md forecast — Low budget risk, no chaining needed)
- Current work unit: Unit 1 — "Raise `BETA_MS` to 8h + rewrite its doc comment in `src/cycle/constants.ts`"
- Boundary: starts and ends with the single `src/cycle/constants.ts` edit; verification (Phase 2)
  included in this batch.
- Estimated review budget impact: ~20-25 changed lines, well under the 400-line budget (Low risk per
  tasks.md's Review Workload Forecast).

## Status

4/5 automatable tasks complete (1.1, 2.1, 2.2, 2.3). Phase 3 requires no apply-phase action (deferred
to archive by design). Task 4.1 intentionally remains open pending live user confirmation — this is
expected and correct, not a blocker to `sdd-verify`. Ready for `sdd-verify`.
