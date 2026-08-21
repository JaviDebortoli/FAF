# Tasks: Inicio Pipeline Diagram + Phantom Scroll Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180-220 |
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
| 1 | Pipeline diagram + Inicio wiring + scroll fix (bundled, both fully specified, low risk) | PR 1 | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` | `npx playwright test` (full e2e suite) | Drop `<PipelineDiagram/>` JSX/import, or revert 2 `<main>` className edits — both independently revertible |

## Phase 1: Pipeline Diagram Component (no spec, no RED — static markup)

- [x] 1.1 Create `app/(dashboard)/components/PipelineDiagram.tsx`: static SVG mirroring `icons.tsx`'s hardcoded pattern (no `lib/` layout file). `viewBox="0 0 960 200"`, 4 rounded-rect nodes (~140×64, `rx=8`) at x=120/360/600/840, y=100, labeled "Datos" → "Indicadores" → "Reglas" → "Recomendación".
- [x] 1.2 In the same file: connect nodes with horizontal `<line>`s + small chevron arrowheads. Colors: `stroke-zinc-700` box borders, `fill-none`/`fill-zinc-900/50` box fill, `fill-zinc-300` text labels, `stroke-zinc-600` connectors at ~0.8-0.9 opacity — strictly zinc/monochrome, no `--color-buy`/`--color-sell`.
- [x] 1.3 Add `role="img"` + `<title>`/`<desc>` matching `ArgumentGraph.tsx`'s a11y pattern, and `data-testid="inicio-pipeline-diagram"` on the root `<svg>`.

## Phase 2: Inicio Wiring

- [x] 2.1 In `app/dashboard/inicio/page.tsx`: import `PipelineDiagram` and insert `<PipelineDiagram />` between the existing info card `<div>` and the "Ver panel de Criptomonedas →" `<Link>`.

## Phase 3: Phantom Scroll Fix — RED (write failing e2e test first)

- [x] 3.1 In `tests/e2e/market-nav.spec.ts`: add a new test (near the "footer never overlaps content" block) asserting no phantom vertical scroll on a short-content route — reuse `gotoCrypto` (empty `EMPTY_REPORT` triggers `EmptyState`) or `/dashboard/acciones` (placeholder route already used at line 82/95). Assert `document.documentElement.scrollHeight <= window.innerHeight` (small tolerance for scrollbar-width quirks if needed), via `page.evaluate`.
- [x] 3.2 Run `npx playwright test tests/e2e/market-nav.spec.ts -g "phantom scroll"` (or the chosen test name) against current (unfixed) code. Confirm it FAILS — proves the test genuinely catches the `min-h-screen` + `pb-48` double-count bug.
- [x] 3.3 Run the existing "footer never overlaps content" tests (both 1280px and 375px, `market-nav.spec.ts:104`) BEFORE the fix. Record pass/fail — exploration flagged uncertainty about whether footer height is already borderline; capture this baseline so any pre-existing issue is attributed correctly.

## Phase 4: Phantom Scroll Fix — GREEN

- [x] 4.1 In `app/dashboard/(with-footer)/crypto/page.tsx` (line 47): change `<main>` className `min-h-screen` → `min-h-[calc(100vh-12rem)]`. Add a brief comment cross-referencing the coupled `12rem` value in `(with-footer)/layout.tsx`'s `pb-48`.
- [x] 4.2 In `app/dashboard/(with-footer)/[market]/page.tsx` (line 34): identical className change and cross-referencing comment.
- [x] 4.3 In `app/dashboard/(with-footer)/layout.tsx`: add a comment near the `pb-48` div noting the `12rem` value is shared/coupled with the two `<main>` `calc(100vh-12rem)` classNames above (same convention as `BETA_MS`'s cross-file coupling comment in `cycle-cache-ttl-6h`).
- [x] 4.4 Re-run the Phase 3.1 test — confirm it now PASSES.
- [x] 4.5 Re-run the "footer never overlaps content" tests (both viewports) AFTER the fix. Compare against the 3.3 baseline; report any change (including a pre-existing failure that persists, unrelated to this fix).

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit` — confirm no type errors.
- [x] 5.2 Run `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` — confirm all pass, including the new phantom-scroll test.
- [x] 5.3 Run full `npx playwright test` suite — confirm no regressions elsewhere.
- [x] 5.4 Run full `npx vitest run` — confirm no unit-test regressions (no new unit tests expected for `PipelineDiagram`, per `icons.tsx` precedent).
- [x] 5.5 Manual visual confirmation: screenshot `/dashboard/inicio` (diagram renders between card and CTA, zinc/monochrome, legible) and a short-content market route (e.g. `/dashboard/acciones` or a filtered-empty crypto view) confirming no phantom scrollbar.
