# Tasks: Graph Edge Contrast & Global Scrollbar Theming

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~15-20 |
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
| 1 | Edge contrast + scrollbar theming, both files | PR 1 | `npx tsc --noEmit` | `npx playwright test tests/e2e/dashboard.spec.ts` | `git revert` the commit, or restore `opacity={0.35}`/remove `stroke-zinc-200`/delete scrollbar CSS block |

## Phase 1: Implementation (GREEN-only — no meaningful RED test for subjective color/scrollbar styling; no existing test asserts these, no visual-regression tooling exists)

- [x] 1.1 `app/(dashboard)/components/ArgumentGraph.tsx` lines 52-61: add `className="stroke-zinc-200"` to edge `<line>` elements; keep `stroke="currentColor"` off (explicit class replaces reliance on the SVG-root `text-zinc-700`). Do not touch line 40 (`text-zinc-700` on `<svg>`) or the conflict node at lines 117-118.
- [x] 1.2 Same `<line>` elements: change `opacity={0.35}` to `opacity={0.5}`.
- [x] 1.3 `app/globals.css`: add a global scrollbar rule using `scrollbar-color: <thumb> <track>` + `scrollbar-width: thin` as primary mechanism (thumb `zinc-700`/`zinc-600`, track `zinc-900`/transparent, matching `border-zinc-800` chrome tone), plus `::-webkit-scrollbar`/`::-webkit-scrollbar-thumb`/`::-webkit-scrollbar-track` fallback. Scope to cover all `overflow-y-auto` containers app-wide (`DrilldownPanel.tsx:53`, `Sidebar.tsx:88`, `Sidebar.tsx:117`) with zero per-component edits.

## Phase 2: Verification

- [x] 2.1 Run `npx tsc --noEmit` — confirm no type errors introduced by the JSX/className change.
- [x] 2.2 Run full `npx playwright test` suite — confirm zero regressions, in particular the existing "Tier 2 — drill-down graph" test and any Sidebar/DrilldownPanel-related tests (neither file's structure or testids change, only styling attributes).
- [x] 2.3 Manual visual confirmation (dev-environment screenshot check, completable by sdd-apply — not a `[MANUAL-VERIFICATION-ONLY]` production gate): with the dev server running, open the same BTCUSDT-style drill-down view originally screenshotted by the user, take a screenshot, and visually confirm (a) graph edges are now clearly visible against the dark background, and (b) the scrollbar in the drill-down panel/sidebar blends with the dark theme instead of showing the browser-default light scrollbar.

## Rules Applied

- Apply any `rules.tasks` from `openspec/config.yaml`.
