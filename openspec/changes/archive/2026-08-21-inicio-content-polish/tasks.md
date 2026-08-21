# Tasks: Inicio Content Polish

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~35-45 |
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
| 1 | Copy/CSS/color polish on Inicio (2 files) | PR 1 | `npx playwright test tests/e2e/market-nav.spec.ts` | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` | Revert `app/dashboard/inicio/page.tsx` + `PipelineDiagram.tsx`, no data/migration |

## Phase 1: Content and Copy (`app/dashboard/inicio/page.tsx`)

- [x] 1.1 Remove the entire `<Link href="/dashboard/crypto">` CTA block (lines 49-54).
- [x] 1.2 Replace `<h1 className="text-2xl font-semibold text-zinc-50">Bienvenido</h1>` with `<h1 className="text-2xl font-semibold text-zinc-50">Bienvenido! Recomendaciones determinísticas y explicables</h1>`.
- [x] 1.3 Change both info-card `<p>` tags' container class from `text-sm text-zinc-400` to `text-base text-zinc-400` on the wrapping `<div>` (line 30).

## Phase 2: Diagram Recolor (`app/(dashboard)/components/PipelineDiagram.tsx`)

- [x] 2.1 Rewrite the stale header comment paragraph (currently "Strictly zinc/monochrome ... deliberately avoids `--color-buy`/`--color-sell`...") to explain the new rationale: reusing the platform's established "active/current" green (`--color-buy`) so Inicio's hero diagram reads as distinctly on-brand.
- [x] 2.2 Recolor connector `<line>` (line 68-76): replace `className="stroke-zinc-600"` with `stroke="var(--color-buy)"`, remove `opacity={0.85}`.
- [x] 2.3 Recolor arrowhead `<polyline>` (line 77-85): replace `className="stroke-zinc-600"` with `stroke="var(--color-buy)"`, remove `opacity={0.85}`.
- [x] 2.4 Recolor node `<rect>` (line 92-100): replace `className="fill-zinc-900/50 stroke-zinc-700"` with `fill="var(--color-buy)" fillOpacity={0.1} stroke="var(--color-buy)"`.
- [x] 2.5 Recolor node `<text>` label (line 101-103): replace `fill-zinc-300` in the className with `fill="var(--color-buy)"` prop, keeping `font-mono text-[13px]` classes.

## Phase 3: Verification (GREEN-only, no RED/GREEN cycle — pure copy/CSS/color change)

- [x] 3.1 Run `npx tsc --noEmit` — confirm no type errors from the JSX prop changes.
- [x] 3.2 Run `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` — confirm the existing `/Bienvenido/` heading regex (line 263) still matches the new longer `<h1>` text, and no other assertion regressed.
- [x] 3.3 Run full `npx playwright test` — confirm no unrelated e2e regression.
- [x] 3.4 Run full `npx vitest run` — confirm no unit test regression.
- [x] 3.5 Manual visual confirmation: screenshot `/dashboard/inicio` and confirm (a) the CTA block is fully gone, (b) the diagram renders clearly in `--color-buy` green including legible green label text on the node box fill, (c) info-card paragraphs render visibly larger (`text-base`), (d) the new heading text is correct and complete.

## Phase 4: Spec Delta (deferred to `sdd-archive`)

- [x] 4.1 Defer merging `openspec/changes/inicio-content-polish/specs/decision-dashboard/spec.md`'s MODIFIED "Crypto dashboard route under market navigation" requirement into `openspec/specs/decision-dashboard/spec.md` to `sdd-archive`, per this repo's established convention (confirmed precedent: `inicio-home-section` and every other MODIFIED-requirement change this session). No action during `sdd-apply`. Completed by `sdd-archive` on 2026-08-21: merged into the live main spec (single `(Previously: ...)` line overwritten, per convention).
