# Apply Progress: Inicio Pipeline Diagram + Phantom Scroll Fix

**Change**: inicio-visual-and-scroll-fix
**Mode**: Strict TDD (scroll-fix portion) + GREEN-only static markup (diagram portion, mirrors `icons.tsx` precedent — no design.md/spec.md exist for this change, deliberately skipped per proposal.md)

## Completed Tasks

All 15 tasks across 5 phases — 100% complete.

- [x] 1.1 Created `app/(dashboard)/components/PipelineDiagram.tsx` — static SVG, `viewBox="0 0 960 200"`, 4 rounded-rect nodes (140×64, rx=8) at x=120/360/600/840, y=100.
- [x] 1.2 Connector `<line>`s + chevron `<polyline>` arrowheads between nodes; `stroke-zinc-700` box borders, `fill-zinc-900/50` box fill, `fill-zinc-300` labels, `stroke-zinc-600` connectors at 0.85 opacity — strictly zinc/monochrome.
- [x] 1.3 `role="img"` + `<title>`/`<desc>` (mirrors `ArgumentGraph.tsx`'s a11y pattern) + `data-testid="inicio-pipeline-diagram"` on root `<svg>`.
- [x] 2.1 Wired `<PipelineDiagram />` into `app/dashboard/inicio/page.tsx` between the info card and the CTA `<Link>`.
- [x] 3.1 Added "no phantom vertical scroll on a short-content route (EmptyState)" test to `tests/e2e/market-nav.spec.ts`.
- [x] 3.2 Confirmed RED against unfixed code.
- [x] 3.3 Captured BASELINE for "footer never overlaps content" (both viewports) before the fix.
- [x] 4.1 `crypto/page.tsx`: `<main>` className `min-h-screen` → `min-h-[calc(100vh-12rem)]` + cross-ref comment.
- [x] 4.2 `[market]/page.tsx`: identical change + cross-ref comment.
- [x] 4.3 `(with-footer)/layout.tsx`: cross-ref comment near `pb-48` (convention mirrors `BETA_MS`'s cross-file coupling comment in `cycle-cache-ttl-6h`).
- [x] 4.4 Confirmed GREEN — new test passes.
- [x] 4.5 Confirmed AFTER footer-overlap results match the BASELINE exactly (2/2 pass, no regression).
- [x] 5.1 `npx tsc --noEmit` — no errors.
- [x] 5.2 Focused e2e (`market-nav.spec.ts` + `dashboard.spec.ts`) — 45/45 pass.
- [x] 5.3 Full `npx playwright test` — 45/45 pass (project has only these two e2e spec files).
- [x] 5.4 Full `npx vitest run` — 224/224 pass, 37 files, no `PipelineDiagram` unit test (by design).
- [x] 5.5 Manual visual confirmation — screenshots captured (see below), reviewed directly.

## TDD Cycle Evidence (scroll-fix portion)

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| Phantom scroll fix (`crypto/page.tsx`, `[market]/page.tsx`, `(with-footer)/layout.tsx`) | Test written first in `market-nav.spec.ts` (3.1); run against unfixed code (3.2) → **FAILED**: `expected <= 801, received 992` at 1280x800 viewport (~191px excess, matching the `pb-48` double-count). Re-confirmed via `git stash` isolation of the 3 fix files after a mid-cycle test-viewport correction (see Issues Found) → **FAILED** again: `expected <= 801, received 992`, identical signature. | After applying the 3 file edits (4.1-4.3), re-ran the same test (4.4) → **PASSED**: `1 passed`. | None needed — the fix was the minimal, already-planned one-line className change per file; no structural rework required. |

Diagram portion (Phase 1-2) is intentionally GREEN-only static markup — matches `icons.tsx`'s precedent (no unit test, no RED/GREEN cycle applicable to hand-drawn SVG), as directed by the user and confirmed in proposal.md's "Out of Scope".

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` → **45 passed** (1.3m) |
| Runtime harness command/scenario and exact result | `npx playwright test` (full suite, all specs) → **45 passed** (1.3m, only 2 spec files exist project-wide); `npx vitest run` → **224 passed / 37 files** |
| Rollback boundary | Fully isolated, independently revertible per proposal.md: drop the `<PipelineDiagram/>` import + JSX line in `inicio/page.tsx` (and delete the new component file) to restore Inicio; OR revert the 3 `<main>`/`pb-48` comment+className edits to restore prior (buggy) scroll behavior. No shared state, no data migrations. |

## Detailed Command Outputs

### RED (3.2) — before fix, against unfixed code, at corrected 1280x800 viewport
```
npx playwright test tests/e2e/market-nav.spec.ts -g "no phantom vertical scroll"

1) [chromium] › market-nav.spec.ts:134:7 › Shared dashboard footer › no phantom vertical scroll on a short-content route (EmptyState)
   Error: expect(received).toBeLessThanOrEqual(expected)
   Expected: <= 801
   Received:    992
1 failed
```
(An initial RED run at Playwright's default 1280x720 project viewport also failed, but for a partially different reason — see "Issues Found" below for why the test was adjusted to an explicit 1280x800 viewport before the final RED/GREEN pair used for evidence.)

### BASELINE (3.3) — footer-overlap test, before fix
```
npx playwright test tests/e2e/market-nav.spec.ts -g "footer never overlaps content"

ok 1 [chromium] › footer never overlaps content at 1280px (2.2s)
ok 2 [chromium] › footer never overlaps content at 375px (1.1s)
2 passed (16.8s)
```
No pre-existing borderline issue — both viewports pass cleanly before the fix.

### GREEN (4.4) — after fix
```
npx playwright test tests/e2e/market-nav.spec.ts -g "no phantom vertical scroll"

ok 1 [chromium] › no phantom vertical scroll on a short-content route (EmptyState) (1.5s)
1 passed (4.5s)
```

### AFTER (4.5) — footer-overlap test, after fix, compared to BASELINE
```
npx playwright test tests/e2e/market-nav.spec.ts -g "footer never overlaps content"

ok 1 [chromium] › footer never overlaps content at 1280px (1.2s)
ok 2 [chromium] › footer never overlaps content at 375px (1.1s)
2 passed (4.2s)
```
**Comparison**: BASELINE 2/2 pass → AFTER 2/2 pass. Identical result, zero regression, zero pre-existing issue surfaced.

### Verification (Phase 5)
```
npx tsc --noEmit                                                     → no output, exit 0
npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts → 45 passed (1.3m)
npx playwright test (full suite)                                     → 45 passed (1.3m)
npx vitest run                                                       → 37 files, 224 tests passed (2.86s)
```

## Deviations from Design

None from proposal.md/exploration.md/tasks.md (no design.md/spec.md exist for this change — confirmed deliberately skipped).

One test-refinement deviation from the literal tasks.md wording worth flagging explicitly:

- **Test viewport correction (Issue → Resolution)**: tasks.md's task 3.1 did not specify an explicit viewport for the new phantom-scroll test, so it initially ran at Playwright's default project viewport (1280×720, confirmed via diagnostic script). Post-fix, this initial default-viewport run still failed by ~21px (742 vs 721), which a targeted diagnostic (`getBoundingClientRect()`/`offsetHeight` dump of every nested layout element) proved was **not** a recurrence of the double-count bug: the real, legitimate content of `<main>` (header + `EmptyState` + gaps + padding) measured 549.5px, which combined with the 192px reserved footer space (741.5px total) genuinely exceeds a 720px-tall viewport — actual content overflow, not a phantom artifact. (For contrast, the original unfixed bug forced a fixed +192px over ANY viewport height, unconditionally — 912px at this same route.) The test was corrected to explicitly `setViewportSize({width: 1280, height: 800})`, matching the already-established viewport convention used by the adjacent "footer never overlaps content" test in the same file. RED/GREEN were then both re-verified at the corrected viewport (RED re-confirmed via `git stash` of only the 3 fix files, isolating the test change from the production change) before this was accepted as the final evidence pair. This is a test-quality correction, not a weakening of the assertion's tolerance or intent.

## Issues Found

None outside the test-viewport correction documented above, which was resolved before completion.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `app/(dashboard)/components/PipelineDiagram.tsx` | Created | Static 4-node SVG pipeline diagram (Datos → Indicadores → Reglas → Recomendación), zinc/monochrome, `role="img"` + `<title>`/`<desc>`, `data-testid="inicio-pipeline-diagram"`. No unit test by design (mirrors `icons.tsx`). |
| `app/dashboard/inicio/page.tsx` | Modified | Imported and inserted `<PipelineDiagram />` between the info card and the CTA `<Link>`. |
| `app/dashboard/(with-footer)/crypto/page.tsx` | Modified | `<main>` className `min-h-screen` → `min-h-[calc(100vh-12rem)]` + cross-ref comment. |
| `app/dashboard/(with-footer)/[market]/page.tsx` | Modified | Identical className change + cross-ref comment. |
| `app/dashboard/(with-footer)/layout.tsx` | Modified | Cross-referencing comment near `pb-48` documenting the shared `12rem` coupling. |
| `tests/e2e/market-nav.spec.ts` | Modified | New "no phantom vertical scroll on a short-content route (EmptyState)" test, explicit 1280x800 viewport. |
| `openspec/changes/inicio-visual-and-scroll-fix/tasks.md` | Modified | All 15 tasks marked `[x]`. |

## Manual Visual Confirmation (5.5)

Captured via a Playwright script driving the real dev server at 1280x800:

- `/dashboard/inicio`: the 4-node pipeline diagram renders between the info card and the CTA, strictly zinc/monochrome (dark node boxes, zinc-300 labels, zinc-600 connectors with chevron arrowheads), legible, matching the info card's own 4-step prose order (Datos → Indicadores → Reglas → Recomendación).
- `/dashboard/crypto` with `EMPTY_REPORT` (triggers `EmptyState`): `document.documentElement.scrollHeight` (800) === `window.innerHeight` (800) exactly — zero phantom scroll, footer sits flush at the bottom of the viewport with no overlap and no excess.

## Workload / PR Boundary

- Mode: single PR (per tasks.md's Review Workload Forecast — 400-line budget risk: Low, Chained PRs recommended: No)
- Current work unit: Unit 1 — "Pipeline diagram + Inicio wiring + scroll fix (bundled, both fully specified, low risk)"
- Boundary: Starts from a clean tree, ends with all 5 phases / 15 tasks complete and fully verified.
- Estimated review budget impact: within the ~180-220 estimated line forecast; no exception needed.

## Status

15/15 tasks complete. Ready for verify.
