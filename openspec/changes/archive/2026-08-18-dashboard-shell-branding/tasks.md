# Tasks: dashboard-shell-branding — sidebar branding + shared footer

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~150-200 total (3 source files + spec delta + 1 test file, per design.md's own File Changes table and code sketches) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (single PR — no chaining decision needed) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Sidebar branding + shared shell footer + old-footer removal | PR1 (single) | `npx playwright test tests/e2e/market-nav.spec.ts` | `npx playwright test` (config spawns `next dev`) | Revert `app/(dashboard)/components/Sidebar.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/crypto/page.tsx`, and the `tests/e2e/market-nav.spec.ts` additions — no data/schema change, no other file touched |

## Phase 1: RED — Failing E2E Tests

- [x] 1.1 `tests/e2e/market-nav.spec.ts`: add `describe('Sidebar branding')` test — desktop nav shows "Plataforma FAF" + subtitle above market groups, scoped via `sidebar-desktop-nav` → `sidebar-branding` testid (design.md exact sketch).
- [x] 1.2 `tests/e2e/market-nav.spec.ts`: inside the existing `Mobile navigation drawer` > `below md breakpoint` block, add a test that the drawer also shows the `sidebar-branding` block after opening via `sidebar-mobile-toggle`.
- [x] 1.3 `tests/e2e/market-nav.spec.ts`: add `describe('Shared dashboard footer')` test — `dashboard-footer` shows exact copy on `/dashboard/crypto`, and identical `innerText` on `/dashboard/acciones` (placeholder route), proving one shared instance. **Deviation**: design.md's sketch used `toHaveText(cryptoFooterText)` against an `innerText()`-captured string; Playwright's `toHaveText` compares `textContent` (no inter-paragraph line break) against an `innerText()` value that includes one, so the two never matched even with byte-identical DOM. Replaced with `expect.poll(() => footer.innerText()).toBe(cryptoFooterText)` to compare `innerText()` on both sides consistently — same test intent, corrected assertion mechanics.
- [x] 1.4 Same describe block: test that `/Trabajo de tesis/` text has zero matches on both `/dashboard/crypto` and `/dashboard/acciones`.
- [x] 1.5 Same describe block: parametrized overlap test at `1280x800` and `375x812` — scroll to bottom, compare `main`'s bottom vs. `dashboard-footer`'s top via `getBoundingClientRect()` in one `page.evaluate`; assert no overlap.
- [x] 1.6 Run `npx playwright test tests/e2e/market-nav.spec.ts` and confirm all 5 new tests fail (branding/footer/padding not yet implemented).

## Phase 2: GREEN — Implementation

- [x] 2.1 `app/(dashboard)/components/Sidebar.tsx`: insert `<div data-testid="sidebar-branding" className="px-3">` (h1 "Plataforma FAF" + p subtitle) as first child of the desktop `<nav>`, above `<MarketLinkGroups>` (design.md exact before/after).
- [x] 2.2 `app/(dashboard)/components/Sidebar.tsx`: insert the same `sidebar-branding` block as first child of the mobile drawer `<nav>`, above the existing "Mercados" close-row div.
- [x] 2.3 `app/dashboard/layout.tsx`: add bottom-padding to the content wrapper and append the shared `<footer data-testid="dashboard-footer" className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950 py-4 md:left-64">` with the exact disclaimer + attribution copy (design.md full-file sketch). **Deviation**: `pb-28` (112px) proved insufficient — empirical measurement showed the footer wraps to 177.5px tall at 375px viewport (design.md's estimate assumed a 4-line/112px max). Changed to `pb-48` (192px) after measuring actual rendered footer height at both 1280px (99.5px) and 375px (177.5px) via Playwright `getBoundingClientRect()`. Confirmed via the overlap test at both viewports (task 1.5/3.3).
- [x] 2.4 `app/dashboard/crypto/page.tsx`: delete the old `<footer className="border-t border-zinc-800 pt-6 font-mono text-xs text-muted">` block (lines 43-45) containing the "Trabajo de tesis" copy.

## Phase 3: Verify

- [x] 3.1 Run `npx vitest run` — confirm no regressions (this change adds no unit-test-covered logic). Result: 223/223 tests passed, 36 files, zero regressions.
- [x] 3.2 Run `npx tsc --noEmit` — confirm clean. Result: clean, zero errors.
- [x] 3.3 Run `npx playwright test` (full suite) — confirm the 6 new tests pass and all pre-existing 28 tests remain green (zero regressions). Result: 34/34 passed (28 pre-existing + 6 new — design.md's test sketch count of "5 new" was actually 6 distinct tests once counted individually: 1 desktop branding + 1 mobile branding + 1 shared-copy + 1 old-footer-absent + 2 overlap parametrized).

## Phase 4: Final Verification — Delta Spec Scenario Self-Check

| Requirement | Scenario | Confirmed by |
|---|---|---|
| Sidebar navigation shell (MODIFIED) | Branding header renders above market groups, desktop and mobile | `market-nav.spec.ts` — "Sidebar branding" desktop test + mobile drawer test (1.1, 1.2) |
| Sidebar navigation shell (MODIFIED) | All markets listed in the correct groups | Pre-existing `market-nav.spec.ts` group-order tests, unchanged — no regression per 3.3 |
| Sidebar navigation shell (MODIFIED) | Active market visually indicated | Pre-existing `market-nav.spec.ts` active-link test, unchanged — no regression per 3.3 |
| Shared shell footer (ADDED) | Footer renders with exact copy on the crypto route | `market-nav.spec.ts` — "Shared dashboard footer" test, crypto assertions (1.3) |
| Shared shell footer (ADDED) | Footer renders with the same exact copy on a placeholder-market route | `market-nav.spec.ts` — same test, `/dashboard/acciones` `innerText` equality (1.3) |
| Shared shell footer (ADDED) | Old footer copy is fully absent from the DOM | `market-nav.spec.ts` — "old thesis footer text is gone everywhere" test (1.4) |
| Shared shell footer (ADDED) | Footer does not overlap page content | `market-nav.spec.ts` — parametrized overlap test at 1280px and 375px (1.5) |

## Delivery Recommendation

Single PR, delivered directly — no chaining, no tracker branch, no `size:exception` needed. 3 source files + spec delta + 1 test file, ~150-200 estimated changed lines, comfortably under the 400-line review budget. Orchestrator should proceed straight to `sdd-apply` for this one work unit; no chain-strategy decision is required before apply.

## Implementation Order

Phase 1 (RED) → Phase 2 (GREEN) → Phase 3 (Verify) → Phase 4 (spec self-check, terminal). Task 2.3's `pb-28` and footer insertion must land together (same file, same task) since the overlap test (1.5) exercises both at once. No cross-file ordering dependency otherwise — all three source files are edited independently.
