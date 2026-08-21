# Apply Progress: Fix Drill-down Argument Graph Collapsing During Narrative Streaming

**Change**: drilldown-graph-layout-fix
**Mode**: Strict TDD
**Status**: 9/9 tasks complete. Ready for verify.

## Completed Tasks

- [x] 1.1 Added `stubNarrativeStreaming(page, chunks)` helper to `tests/e2e/dashboard.spec.ts` — overrides `window.fetch` via `page.addInitScript` for the narrative endpoint, returning a `Response` backed by a `ReadableStream` that enqueues each chunk after a 40ms delay. Every other request still uses the real `fetch`.
- [x] 1.2 Added a new test `'graph stays visible with non-zero height while the narrative streams and grows'` inside `test.describe('Tier 2 — drill-down graph', ...)`. Streams 30 chunks (~1.5s total), polls every 150ms for up to 20 iterations, asserts every `graph-node-R1..R8` stays visible with `boundingBox().height > 4`, and asserts (sanity guards) that at least one poll landed while the narrative was still in `streaming`/`loading` state and that a non-degenerate height was observed at least once — so the test cannot pass vacuously.
- [x] 1.3 Ran the new test against unfixed source 3x — reliably FAILED every time at poll 0 (narrative state `streaming`), e.g. `graph-node-R2 height collapsed to 1.87px`. Confirms the test catches the real mid-stream regression.
- [x] 2.1 `app/(dashboard)/components/ArgumentGraph.tsx:40` — added `shrink-0` to the root `<svg>` className.
- [x] 2.2 `app/(dashboard)/components/ThesisScores.tsx:19` — added `shrink-0` to the root `<dl>` className.
- [x] 2.3 `app/(dashboard)/components/NarrativePanel.tsx:117` — added `shrink-0` to the root `<section>` className.
- [x] 2.4 Re-ran the new test 3x against the fixed source — PASSED reliably all 3 times (~6.7-7.1s each).
- [x] 3.1 `npx tsc --noEmit` — zero type errors.
- [x] 3.2 `npx playwright test tests/e2e/dashboard.spec.ts` — 13/13 passed, including the pre-existing `Tier 2 — drill-down graph` test and all `stubNarrativeSuccess`-based tests. Zero regressions.
- [x] 3.3 `npx playwright test` (full suite) — 39/39 passed. Zero cross-file regressions.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `tests/e2e/dashboard.spec.ts` | Modified | Added `stubNarrativeStreaming` helper + new streaming-narrative regression test asserting non-zero graph-node bounding-box height mid-stream |
| `app/(dashboard)/components/ArgumentGraph.tsx` | Modified | Added `shrink-0` to root `<svg>` className (line 40) — the actual fix |
| `app/(dashboard)/components/ThesisScores.tsx` | Modified | Added `shrink-0` to root `<dl>` className (line 19) — defensive hardening |
| `app/(dashboard)/components/NarrativePanel.tsx` | Modified | Added `shrink-0` to root `<section>` className (line 117) — defensive hardening |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.3 / 2.1-2.4 | `tests/e2e/dashboard.spec.ts` | E2E (Playwright) | N/A (new test); baseline 12/12 pre-existing dashboard.spec.ts tests passing before this change | Written and confirmed failing 3/3 runs against unfixed source (`graph-node-R2 height collapsed to 1.87px`, state `streaming`) | Executed and passing 3/3 runs against fixed source | ➖ Single scenario — proposal.md explicitly scoped this as one regression test covering the one confirmed mechanism, not a matrix of scenarios | ➖ None needed — 3-line CSS fix, no structural cleanup applicable |

### Test Summary
- **Total tests written**: 1 (new) + 1 (helper, not itself a test)
- **Total tests passing**: 39/39 (full suite), 13/13 (focused dashboard.spec.ts file)
- **Layers used**: E2E (1 new)
- **Approval tests** (refactoring): None — no refactoring tasks
- **Pure functions created**: 0 (pure CSS class fix, no new logic)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/e2e/dashboard.spec.ts -g "graph stays visible with non-zero height"` — RED 3/3 fail pre-fix, GREEN 3/3 pass post-fix |
| Runtime harness command/scenario and exact result | `npx playwright test tests/e2e/dashboard.spec.ts` (13/13 passed) then `npx playwright test` full suite (39/39 passed) against `next dev` on port 3100 |
| Rollback boundary | Revert 3 `shrink-0` one-line class additions + remove the new test/helper from `tests/e2e/dashboard.spec.ts`; no state/API/data changes involved |

## Deviations from Design

None — implementation matches proposal.md/tasks.md exactly. One implementation detail not pre-specified: the streaming stub uses a `window.fetch` override via `page.addInitScript` (as suggested as the primary option in tasks.md 1.1) rather than `page.route` with `route.fulfill`, since Playwright's `route.fulfill` cannot deliver a body progressively across multiple calls — this was the only viable approach for true chunked delivery and matches tasks.md's explicit guidance.

One tuning deviation discovered during RED authoring: the test needed 30 chunks (not fewer) and a 150ms/20-poll window (not a smaller one) to reliably land a poll while `data-state` is still `streaming` — smaller chunk counts and tighter poll windows produced test flakiness (occasionally missed the mid-stream collapse window). Verified reliable 3/3 in both RED and GREEN states with the final parameters.

## Issues Found

None.

## Workload / PR Boundary

- Mode: single PR
- Current work unit: Unit 1 (RED test + GREEN CSS fix + verification) — the only unit
- Boundary: starts at the RED test addition, ends at full-suite verification; complete in this batch
- Estimated review budget impact: ~90 changed lines (well under 400-line budget; forecast was Low risk)
