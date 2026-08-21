# Apply Progress: graph-scrollbar-theming

## Mode

Standard (Strict TDD global convention active, but no RED/GREEN cycle applies here per tasks.md Phase 1 header: "GREEN-only — no meaningful RED test for subjective color/scrollbar styling; no existing test asserts these, no visual-regression tooling exists." Confirmed by exploration.md's Test-Impact Catalog. This exception is pre-documented in the tasks artifact itself, not a silent deviation.)

## Completed Tasks

### Phase 1: Implementation
- [x] 1.1 `app/(dashboard)/components/ArgumentGraph.tsx` — edge `<line>` elements (lines ~52-61) now use `className="stroke-zinc-200"` instead of `stroke="currentColor"`. SVG root `text-zinc-700` (line 40) and conflict node (lines 117-118) untouched.
- [x] 1.2 Same `<line>` elements — `opacity={0.35}` → `opacity={0.5}`.
- [x] 1.3 `app/globals.css` — added global scrollbar theming block after the `body` rule: `html { scrollbar-color: #3f3f46 #18181b; scrollbar-width: thin; }` plus `::-webkit-scrollbar` / `::-webkit-scrollbar-track` / `::-webkit-scrollbar-thumb` fallback (thumb `#3f3f46` = zinc-700, track `#18181b` = zinc-900, matching `border-zinc-800` chrome tone). Scoped globally via `html`/`::-webkit-scrollbar` (no `*` needed since `scrollbar-color` inherits) — covers all 3 `overflow-y-auto` sites with zero per-component edits.

### Phase 2: Verification
- [x] 2.1 `npx tsc --noEmit` — clean, zero errors.
- [x] 2.2 `npx playwright test` (full suite) — 39/39 passed, zero regressions (including "Tier 2 — drill-down graph" and all Sidebar/market-nav tests).
- [x] 2.3 Manual visual confirmation — see Visual Confirmation Evidence below.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `app/(dashboard)/components/ArgumentGraph.tsx` | Modified | Edge `<line>` elements: `stroke="currentColor"` → `className="stroke-zinc-200"`; `opacity` 0.35 → 0.5 |
| `app/globals.css` | Modified | Added global scrollbar theming block (`scrollbar-color`/`scrollbar-width: thin` + `::-webkit-scrollbar*` fallback) after the `body` rule |
| `openspec/changes/graph-scrollbar-theming/tasks.md` | Modified | Marked all Phase 1/2 tasks `[x]` |

## Visual Confirmation Evidence (Task 2.3)

Method: since no automated visual-regression tooling exists (confirmed in exploration.md), used a throwaway Playwright script (deleted after use, not committed) that reused the existing `dashboard.spec.ts` BTCUSDT fixture/route-mocking pattern to open the drill-down panel against `npm run dev`-equivalent (`next dev -p 3100`, the same server Playwright's `webServer` config spins up), and captured screenshots.

**(a) Edge contrast** — screenshot of the opened BTCUSDT drill-down panel (1280x800 viewport) shows all 8 leaf-to-aggregate and aggregate-to-net/conflict edges as clearly visible light-gray lines against the near-black (`#09090b`) panel background — a marked improvement over the prior near-invisible `zinc-700 @ 0.35` opacity lines. Conflict node (⊖, center) visually unchanged (still `currentColor`/`zinc-700`), confirming out-of-scope element was not touched.

**(b) Scrollbar theming** — forcing overflow (panel `scrollHeight` 734px vs `clientHeight` 286px, confirmed via `element.scrollHeight`/`clientHeight` inspection) and inspecting `getComputedStyle(panel).scrollbarColor` returned exactly `rgb(63, 63, 70) rgb(24, 24, 27)` (= `#3f3f46`/`#18181b`, matching the authored CSS precisely), with a 2px layout gutter confirming the `thin` variant is in effect (vs. the browser's ~15-17px default).

Note: Playwright's bundled Chromium runs headless screenshots with the `--hide-scrollbars` launch flag by default (a well-known Playwright/Puppeteer determinism setting), which suppressed the native scrollbar in the first several screenshot attempts despite the CSS being correctly applied (confirmed via computed style above). Re-launching a browser instance with `ignoreDefaultArgs: ['--hide-scrollbars']` produced a screenshot with the scrollbar rendered natively: it shows a rounded, muted dark-gray thumb (`zinc-700` tone) on a near-black track (`zinc-900` tone), replacing what would otherwise be the jarring default light-gray-on-white OS scrollbar. Both the computed-style evidence and the un-hidden-scrollbar screenshot corroborate the same result.

All screenshots and the throwaway test script were deleted after inspection (scratch artifacts only, not part of the deliverable).

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx tsc --noEmit` — exit 0, no errors |
| Runtime harness command/scenario and exact result | `npx playwright test` — 39/39 passed (55.0s), including "Tier 2 — drill-down graph" (2 tests) and all Sidebar/market-nav tests (18 tests) |
| Rollback boundary | `git revert` the commit, or manually: remove `className="stroke-zinc-200"` and restore `opacity={0.35}` on the edge `<line>` elements in `ArgumentGraph.tsx`; delete the added scrollbar CSS block from `globals.css` |

## Deviations from Design

None — no design.md/spec.md exist for this change (deliberately skipped per proposal.md, pure CSS/SVG-attribute visual-polish change with no capability/spec impact). Implementation matches proposal.md's "Approach" section and tasks.md exactly.

## Issues Found

None.

## Remaining Tasks

None — all tasks (1.1, 1.2, 1.3, 2.1, 2.2, 2.3) complete.

## Workload / PR Boundary

- Mode: single PR (per tasks.md Review Workload Forecast: ~15-20 changed lines, Low risk, no chaining needed)
- Current work unit: Unit 1 — "Edge contrast + scrollbar theming, both files"
- Boundary: starts and ends with this single apply batch — both files, verification, and manual visual confirmation all completed in one pass
- Estimated review budget impact: well under the 400-line budget; no PR splitting needed

## Status

6/6 tasks complete. Ready for verify.
