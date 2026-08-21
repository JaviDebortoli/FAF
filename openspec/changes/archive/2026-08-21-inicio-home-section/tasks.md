# Tasks: Inicio Home Section

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~210–380 (moves counted as renames vs. full delete+add) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

**Rationale**: 9 core files (~210 authored lines: new Inicio page ~30, `icons.tsx` +9, `Sidebar.tsx` +25, 2 redirect one-liners, `layout.tsx` ~30, new `(with-footer)/layout.tsx` ~40, e2e specs ~70, unit-test import fix 1) plus 2 pure content-identical file moves (`crypto/page.tsx`, `[market]/page.tsx`) whose diff cost is ~0 if Git detects the rename, ~170 if not. Use `git mv` for both moves to preserve rename detection and keep the diff near the low end. The footer-exclusion slice (`layout.tsx`, new `(with-footer)/layout.tsx`, both moves, the test-import fix) is one atomic unit — tests only pass with all of it landed together, so splitting it into its own PR would leave an intermediate broken state without extra glue code. Single PR is the call; re-forecast only if the actual diff exceeds 400.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Full Inicio change (routing, sidebar, icon, footer exclusion) | PR 1 | `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts` | `npx playwright test` (full) + `npx vitest run` | Revert PR; redirects/moves independently revertible per design.md Rollback Plan |

## Phase 1: RED — Tests First

- [x] 1.1 Rewrite bare-`/dashboard` test in `tests/e2e/dashboard.spec.ts`: assert landing on `/dashboard/inicio`; move BUY-card assertions to a new direct `/dashboard/crypto` visit test.
- [x] 1.2 Add new root-`/` → `/dashboard/inicio` redirect test in `tests/e2e/dashboard.spec.ts`.
- [x] 1.3 In `tests/e2e/market-nav.spec.ts` "Sidebar — group order", prepend `'inicio'` to the expected slug list.
- [x] 1.4 Add Inicio `aria-current`/active-link test in `tests/e2e/market-nav.spec.ts` (active on `/dashboard/inicio`, inactive elsewhere).
- [x] 1.5 Add "Inicio renders no `dashboard-footer`" test in `tests/e2e/market-nav.spec.ts`.
- [x] 1.6 Run 1.1–1.5 against current code; confirm RED (failures), not false-passes.

## Phase 2: GREEN — Implementation

- [x] 2.1 Create `app/dashboard/inicio/page.tsx` per design.md's exact content (eyebrow + `<h1>` + σ/γ/ρ/θ=0.67 copy + CTA to `/dashboard/crypto`).
- [x] 2.2 Add `Home` icon (design.md's exact SVG paths) to `app/(dashboard)/components/icons.tsx`; add to `Icons` export.
- [x] 2.3 Extract `InicioLink({ activeSlug, onLinkClick })` in `Sidebar.tsx`; call it between branding and `<MarketLinkGroups>` in desktop `<nav>` and mobile drawer; change `activeSlug` fallback `?? 'crypto'` → `?? 'inicio'`.
- [x] 2.4 Retarget `app/dashboard/page.tsx` redirect to `/dashboard/inicio`.
- [x] 2.5 Retarget `app/(dashboard)/page.tsx` redirect to `/dashboard/inicio`.
- [x] 2.6 Modify `app/dashboard/layout.tsx`: remove `<footer>` and `pb-48`, per design.md's new-content block.
- [x] 2.7 Create `app/dashboard/(with-footer)/layout.tsx` carrying `pb-48` wrapper + `<footer>` moved verbatim (exact copy/className/`data-testid`).
- [x] 2.8 `git mv app/dashboard/crypto/page.tsx app/dashboard/(with-footer)/crypto/page.tsx` — content unchanged.
- [x] 2.9 `git mv app/dashboard/[market]/page.tsx app/dashboard/(with-footer)/[market]/page.tsx` — content unchanged.
- [x] 2.10 **CRITICAL**: update `tests/dashboard/crypto/page.test.ts` import `@/app/dashboard/crypto/page` → `@/app/dashboard/(with-footer)/crypto/page`.

## Phase 3: REFACTOR / Verify

- [x] 3.1 Scan `app/dashboard/layout.tsx`, moved files, and touched imports for dead code left by the moves/removal.
- [x] 3.2 `npx tsc --noEmit`.
- [x] 3.3 `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts` — confirm GREEN.
- [x] 3.4 `npx vitest run` — full unit suite (covers `tests/dashboard/crypto/page.test.ts` import fix and `tests/unit/markets.test.ts`).
- [x] 3.5 `npx playwright test` — full suite, confirm zero cross-file regressions (footer-copy, static-route-precedence, mobile-drawer tests unaffected).

## Phase 4: Deferred

- [x] 4.1 Do NOT merge `openspec/specs/market-navigation/spec.md` / `decision-dashboard/spec.md` deltas during apply — defer to `sdd-archive` per repo convention. Completed by `sdd-archive`: 4 MODIFIED requirements (3 in `market-navigation`, 1 in `decision-dashboard`) merged into the live main specs with `(Previously: ...)` trailing lines. See `archive-report.md`.
