# Tasks: Dashboard Cleanup and Inicio Footer Revert

## Review Workload Forecast

Estimated changed lines: ~150-220 | 400-line budget risk: Low | Chained PRs recommended: No | Split: single PR | Delivery strategy: ask-on-risk (default) | Chain strategy: pending

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

Work unit: all 3 points, Point 3 as one atomic commit. Focused test: `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts`. Harness: Playwright vs local `npm run dev`. Rollback: single revert; Point 3's move/className/comments/tests revert together.

## Phase 1: Point 1 — punctuation (GREEN-only)

- [x] 1.1 `app/dashboard/inicio/page.tsx` (~L37-38): replace arrow-separated pipeline phrase with "(ingesta de datos de mercado, indicadores técnicos, reglas argumentativas y agregación de puntajes)".

## Phase 2: Point 2 — ThesisScores θ/gap removal (GREEN-only)

- [x] 2.1 `ThesisScores.tsx`: delete gap `<div className="col-span-2 ...">` row (~L38-41).
- [x] 2.2 Delete θ `<dd>` block inside `ThesisColumn` (~L78-81).
- [x] 2.3 Remove `theta` from `ThesisColumnProps`, `ThesisColumn` destructure, both `<ThesisColumn theta={theta}>` call sites.
- [x] 2.4 Narrow `ThesisScores`'s `computeScores(decision)` destructure to `{ sigmaPlus, sigmaMinus }`; leave `lib/scores.ts`'s `computeScores` signature untouched.
- [x] 2.5 Confirm `DecisionCard.tsx`'s θ/gap display untouched (out of scope).

## Phase 3: Point 3 — RED: invert/add footer & scroll tests (must fail pre-move)

- [x] 3.1 `market-nav.spec.ts` describe `'Inicio route — no dashboard footer'` (~L253-267): invert to assert footer presence + exact shared copy, mirroring "renders identical footer copy" (~L74-90).
- [x] 3.2 Extend "footer never overlaps content" viewport loop (~L104-115) to also cover `/dashboard/inicio`.
- [x] 3.3 Add "no phantom vertical scroll on /dashboard/inicio" test beside the crypto-only one (~L134-147): same `scrollHeight <= innerHeight + 1` assertion. Deviation: 1280x1000 viewport, not 1280x800 as originally suggested — see apply-progress "Deviations from Design".
- [x] 3.4 Run `npx playwright test tests/e2e/market-nav.spec.ts`; confirm 3.1-3.2 FAIL pre-move (3.3 passes pre-move by coincidence — see apply-progress).

## Phase 4: Point 3 — GREEN: atomic footer-revert unit

- [x] 4.1 `git mv app/dashboard/inicio/page.tsx app/dashboard/(with-footer)/inicio/page.tsx`.
- [x] 4.2 Moved file `<main>` className: `min-h-screen` → `min-h-[calc(100vh-12rem)]` (match `crypto/page.tsx`/`[market]/page.tsx` exactly; mandatory).
- [x] 4.3 Rewrite moved page's header comment (~L19-22): drop footer-exclusion claim.
- [x] 4.4 Rewrite `app/dashboard/layout.tsx` header comment (~L18-25): drop "Inicio exception" claim.
- [x] 4.5 Rewrite `app/dashboard/(with-footer)/layout.tsx` header comment (~L1-9): drop "Inicio stays outside" claim.
- [x] 4.6 Re-run `npx playwright test tests/e2e/market-nav.spec.ts`; confirm 3.1-3.3 PASS.

## Phase 5: Point 3 — prove the regression test is real

- [x] 5.1 Temporarily undo only 4.2 (keep `git mv`, restore `min-h-screen`); re-run 3.3; confirm it FAILS.
- [x] 5.2 Re-apply 4.2; re-run 3.3; confirm PASS.

## Phase 6: Verification

- [x] 6.1 `npx tsc --noEmit`.
- [x] 6.2 `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts`.
- [x] 6.3 `npx playwright test` (full suite).
- [x] 6.4 `npx vitest run` (full suite).
- [x] 6.5 Manual visual check (sdd-apply may mark complete): screenshot `/dashboard/inicio` — punctuation fix, footer matches crypto with no overlap, no phantom scroll.

## Phase 7: Deferred

- [x] 7.1 Merge `market-navigation/spec.md`'s MODIFIED "Shared shell footer" delta — deferred to `sdd-archive`, per repo convention. Completed during `sdd-archive`: delta applied verbatim to `openspec/specs/market-navigation/spec.md`.
