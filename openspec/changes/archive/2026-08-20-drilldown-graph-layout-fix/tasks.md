# Tasks: Fix Drill-down Argument Graph Collapsing During Narrative Streaming

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60-90 (3 one-line CSS additions + new e2e test + streaming stub helper) |
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
| 1 | RED test + GREEN CSS fix + verification | PR 1 | `npx playwright test tests/e2e/dashboard.spec.ts` | Playwright (Chromium) against `next dev`/`next start` | Revert 3 `shrink-0` class additions + remove new test/helper; no state/API impact |

## Phase 1: RED — Write the failing regression test first

- [x] 1.1 In `tests/e2e/dashboard.spec.ts`, add a `stubNarrativeStreaming(page, chunks: string[])` helper near `stubNarrativeSuccess`/`stubNarrativeError` (~line 210-232) that delivers a long narrative incrementally (browser-side `fetch` override via `page.addInitScript` returning a `ReadableStream` that enqueues each chunk with a short delay, or an equivalent local chunked-delivery technique) — reuse the existing `text/plain` contract `NarrativePanel.tsx` expects.
- [x] 1.2 Add a new test inside (or alongside) `test.describe('Tier 2 — drill-down graph', ...)` (~line 388) that: opens the drill-down for an asset, stubs the narrative with `stubNarrativeStreaming` using a long multi-chunk narrative, and asserts `panel.getByTestId('graph-node-R1'..'R8')` remain visible with non-zero `boundingBox()` height at multiple points *during* the stream (poll after each chunk lands, not only before/after).
- [x] 1.3 Run `npx playwright test tests/e2e/dashboard.spec.ts -g "graph stays"` (or the actual test title) against the unfixed source; confirm it FAILS (graph node bounding box collapses toward 0 mid-stream) — proves the test catches the real regression before any fix is applied.

## Phase 2: GREEN — Apply the three `shrink-0` fixes

- [x] 2.1 `app/(dashboard)/components/ArgumentGraph.tsx:40` — change `className="h-auto w-full text-zinc-700"` to `className="h-auto w-full shrink-0 text-zinc-700"` on the root `<svg>`.
- [x] 2.2 `app/(dashboard)/components/ThesisScores.tsx:19` — change `className="grid grid-cols-2 gap-3"` to `className="grid shrink-0 grid-cols-2 gap-3"` on the root `<dl>`.
- [x] 2.3 `app/(dashboard)/components/NarrativePanel.tsx:117` — change `className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3"` to add `shrink-0` on the root `<section>`.
- [x] 2.4 Re-run the new test from 1.2; confirm it now PASSES.

## Phase 3: Verification — no regressions

- [x] 3.1 Run `npx tsc --noEmit`; confirm zero type errors.
- [x] 3.2 Run `npx playwright test tests/e2e/dashboard.spec.ts` (full file, focused); confirm zero regressions, in particular the existing `Tier 2 — drill-down graph` test (line 388) and the static-narrative tests (`stubNarrativeSuccess`-based).
- [x] 3.3 Run `npx playwright test` (full suite); confirm zero cross-file regressions.
