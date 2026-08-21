# Apply Progress: Inicio Home Section

**Change**: inicio-home-section
**Mode**: Strict TDD
**Status**: All assigned tasks complete (Phase 1–3). Phase 4 (task 4.1) deliberately deferred to `sdd-archive` per repo convention — not part of this apply batch.

## Completed Tasks

### Phase 1 — RED
- [x] 1.1 Rewrote bare-`/dashboard` test in `tests/e2e/dashboard.spec.ts` to assert landing on `/dashboard/inicio`; moved BUY-card assertions to a new "Direct /dashboard/crypto visit" test.
- [x] 1.2 Added new root-`/` → `/dashboard/inicio` redirect test in `tests/e2e/dashboard.spec.ts`.
- [x] 1.3 Prepended `'inicio'` to the expected slug list in `tests/e2e/market-nav.spec.ts` "Sidebar — group order".
- [x] 1.4 Added Inicio `aria-current`/active-link tests in `tests/e2e/market-nav.spec.ts` (active on `/dashboard/inicio`, inactive elsewhere; inverse check on `/dashboard/crypto`).
- [x] 1.5 Added "Inicio renders no `dashboard-footer`" test in `tests/e2e/market-nav.spec.ts`.
- [x] 1.6 Ran 1.1–1.5 against current code; confirmed genuine RED (6 failures — see TDD Cycle Evidence below; one negative-assertion test needed strengthening after an initial false-pass).

### Phase 2 — GREEN
- [x] 2.1 Created `app/dashboard/inicio/page.tsx` — Server Component, eyebrow + `<h1>` + σ/γ/ρ/θ=0.67 copy + CTA to `/dashboard/crypto`, per design.md verbatim.
- [x] 2.2 Added `Home` icon (design.md's exact SVG paths) to `app/(dashboard)/components/icons.tsx`; added to `Icons` export.
- [x] 2.3 Extracted `InicioLink({ activeSlug, onLinkClick })` in `Sidebar.tsx`; wired between branding and `<MarketLinkGroups>` in both desktop `<nav>` and mobile drawer; `activeSlug` fallback `?? 'crypto'` → `?? 'inicio'`.
- [x] 2.4 Retargeted `app/dashboard/page.tsx` redirect to `/dashboard/inicio`.
- [x] 2.5 Retargeted `app/(dashboard)/page.tsx` redirect to `/dashboard/inicio`.
- [x] 2.6 Modified `app/dashboard/layout.tsx`: removed `<footer>` and `pb-48`, now a plain `<Sidebar/>` + `flex-1 md:pl-64` shell.
- [x] 2.7 Created `app/dashboard/(with-footer)/layout.tsx` carrying `pb-48` wrapper + `<footer>` moved verbatim (same copy/className/`data-testid="dashboard-footer"`).
- [x] 2.8 `git mv app/dashboard/crypto/page.tsx app/dashboard/(with-footer)/crypto/page.tsx` — confirmed zero content diff (clean rename detection).
- [x] 2.9 `git mv "app/dashboard/[market]/page.tsx" "app/dashboard/(with-footer)/[market]/page.tsx"` — confirmed zero content diff.
- [x] 2.10 Updated `tests/dashboard/crypto/page.test.ts` import `@/app/dashboard/crypto/page` → `@/app/dashboard/(with-footer)/crypto/page`.

### Phase 3 — REFACTOR / Verify
- [x] 3.1 Swept `app/dashboard/layout.tsx`, moved files, and touched imports for dead code — none found; moved files are byte-identical (git rename-detected, zero diff); own new files/comments reviewed for stale path references.
- [x] 3.2 `npx tsc --noEmit` — clean (after clearing stale `.next/types` cache left over from the pre-move build; see Issues Found).
- [x] 3.3 `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts` — 44/44 passed.
- [x] 3.4 `npx vitest run` — 37 files / 224 tests passed, including `tests/dashboard/crypto/page.test.ts` and `tests/unit/markets.test.ts`.
- [x] 3.5 `npx playwright test` (full suite) — 44/44 passed. This repo's entire Playwright suite is `dashboard.spec.ts` + `market-nav.spec.ts`, so full ≡ focused here; zero cross-file regressions confirmed.

### Phase 4 — Deferred (not part of this apply batch)
- [ ] 4.1 Do NOT merge `openspec/specs/market-navigation/spec.md` / `decision-dashboard/spec.md` deltas during apply — deferred to `sdd-archive` per repo convention (left unchecked intentionally).

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `app/dashboard/inicio/page.tsx` | Created | New Server Component landing route; heading + copy + CTA |
| `app/dashboard/(with-footer)/layout.tsx` | Created | Footer + `pb-48`, moved verbatim from `app/dashboard/layout.tsx` |
| `app/dashboard/layout.tsx` | Modified | Removed `<footer>` + `pb-48`; now plain `<Sidebar/>` + content wrapper |
| `app/dashboard/page.tsx` | Modified | `redirect('/dashboard/crypto')` → `redirect('/dashboard/inicio')` |
| `app/(dashboard)/page.tsx` | Modified | Same redirect retarget |
| `app/(dashboard)/components/Sidebar.tsx` | Modified | New `InicioLink` sub-component wired into desktop nav + mobile drawer; `activeSlug` fallback → `'inicio'` |
| `app/(dashboard)/components/icons.tsx` | Modified | New `Home` icon function + `Icons.Home` export |
| `app/dashboard/crypto/page.tsx` → `app/dashboard/(with-footer)/crypto/page.tsx` | Moved (git mv, rename-detected, zero content diff) | Footer route-group restructuring |
| `app/dashboard/[market]/page.tsx` → `app/dashboard/(with-footer)/[market]/page.tsx` | Moved (git mv, rename-detected, zero content diff) | Footer route-group restructuring |
| `tests/dashboard/crypto/page.test.ts` | Modified | Import path fixed for the crypto page move |
| `tests/e2e/dashboard.spec.ts` | Modified | Bare-`/dashboard` rewrite, new root-`/` test, new direct-`/dashboard/crypto` test |
| `tests/e2e/market-nav.spec.ts` | Modified | Group-order `'inicio'` prepend (desktop + mobile drawer), new Inicio active-link tests, new no-footer test |
| `openspec/changes/inicio-home-section/tasks.md` | Modified | `[x]` marks for Phase 1–3 |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/2.4/2.5 | `tests/e2e/dashboard.spec.ts` (Bare /dashboard redirect) | E2E | ✅ 39/39 (baseline full run) | ✅ Written, confirmed failing (`/dashboard/crypto` still resolved) | ✅ Passed after redirect retarget | ➖ Single scenario | ➖ None needed |
| 1.2/2.4/2.5 | `tests/e2e/dashboard.spec.ts` (Root / redirect) | E2E | ✅ same baseline | ✅ Written, confirmed failing | ✅ Passed | ➖ Single scenario | ➖ None needed |
| 1.1 (moved assertions) | `tests/e2e/dashboard.spec.ts` (Direct /dashboard/crypto visit) | E2E | N/A (new test, pre-existing behavior) | ✅ Written (passed immediately — asserts pre-existing crypto-page behavior, not new production code) | ✅ Passed | ➖ N/A — approval-style assertion of unchanged behavior | ➖ None needed |
| 1.3/2.3 | `tests/e2e/market-nav.spec.ts` (Sidebar — group order, desktop + mobile drawer) | E2E | ✅ same baseline | ✅ Written, confirmed failing (missing `sidebar-link-inicio` in order array) both for desktop AND mobile drawer (mobile-drawer instance found live during Phase 3 full-suite run, fixed same cycle — see Issues Found) | ✅ Passed after `InicioLink` wired into both nav surfaces | ✅ 2 cases (desktop nav + mobile drawer) | ➖ None needed |
| 1.4/2.3 | `tests/e2e/market-nav.spec.ts` (Sidebar — Inicio link, 2 tests) | E2E | ✅ same baseline | ✅ Written, confirmed failing (`sidebar-link-inicio` element not found — pre-`InicioLink`) | ✅ Passed | ✅ 2 cases (active on /inicio; inactive on /crypto) | ➖ None needed |
| 1.5/2.1 | `tests/e2e/market-nav.spec.ts` (Inicio route — no dashboard footer) | E2E | ✅ same baseline | ⚠️→✅ Initial assertion was a **false pass** (404 page also has zero `dashboard-footer` elements) — caught per strict-tdd's "GREEN that passes trivially" rule; strengthened with a `response.status() < 400` + heading-visibility guard before the negative footer assertion, re-confirmed genuine RED (404) | ✅ Passed after `inicio/page.tsx` created | ➖ Single scenario, now non-vacuous | ➖ None needed |
| 2.6/2.7/2.8/2.9 | Full e2e + unit suites (footer-copy, static-route-precedence tests) | E2E + Unit | ✅ 39/39 pre-move baseline | N/A — refactor-style move, approval tests are the pre-existing footer/route-precedence tests themselves | ✅ All pre-existing footer/placeholder/static-precedence tests still passed post-move | N/A | ➖ None needed — zero-diff `git mv` |
| 2.10 | `tests/dashboard/crypto/page.test.ts` | Unit | ✅ 1/1 pre-fix (import broken only after the move, not before) | N/A — mechanical import-path fix required by the move, not new behavior | ✅ Passed (1/1) | ➖ N/A | ➖ None needed |

## Test Summary
- **Total tests written/modified**: 8 (2 new dashboard.spec.ts tests + 1 relocated test, 4 new market-nav.spec.ts tests, 1 modified group-order assertion + 1 modified mobile-drawer group-order assertion, 1 import-path fix)
- **Total tests passing**: 224 (vitest) + 44 (playwright, full suite) = 268
- **Layers used**: Unit (224), E2E (44)
- **Approval tests** (refactoring): the pre-existing footer-copy, static-route-precedence, and mobile-drawer test suites served as approval tests across the `git mv` restructuring — all passed unchanged post-move
- **Pure functions created**: 0 (this change is UI routing/composition — React Server/Client Components, no new pure-function logic per design.md's Threat Matrix note: "N/A — client-side page routing")

## Deviations from Design

None — implementation matches design.md exactly, including exact copy, exact SVG path data for the `Home` icon, exact `InicioLink` className/structure (mirrors `MarketLinkGroups`'s active-state pattern), and the exact route-group file layout.

One task-list gap found and fixed during Phase 3 (not a design deviation): `tasks.md`'s Phase 1 RED list didn't call out updating the pre-existing mobile-drawer "clicking the hamburger opens the drawer listing the same groups/markets/order as desktop" test in `tests/e2e/market-nav.spec.ts`. Since design.md explicitly requires `InicioLink` in the mobile drawer too (and `specs/market-navigation/spec.md`'s "Inicio link renders between branding and market groups" scenario literally covers both surfaces), this was a legitimate spec-mandated behavior change that broke an out-of-scope-per-task-list assertion. Fixed by prepending `'inicio'` to that test's expected slug array, mirroring the desktop fix from task 1.3.

## Issues Found

1. **Stale `.next/types` cache**: after the `git mv` route moves, `npx tsc --noEmit` initially failed with `Cannot find module '.../app/dashboard/crypto/page.js'` — these were Next.js's auto-generated route-type declarations from the pre-move build, not a real type error. Resolved by deleting `.next/` and re-running; no production code was at fault.
2. **False-pass test caught and fixed**: the initial "Inicio renders no dashboard-footer" test passed trivially against a 404 (nonexistent route also has zero footer elements). Caught per strict-tdd's assertion-quality rules before proceeding to GREEN; strengthened with a status-code + content-visibility guard. See TDD Cycle Evidence row for task 1.5.
3. **Mobile-drawer group-order test gap**: see "Deviations from Design" above — not a design issue, a `tasks.md` RED-list omission, fixed in the same batch.

## Workload / PR Boundary
- Mode: single PR (per tasks.md's Review Workload Forecast: Medium risk, no chaining required)
- Current work unit: Unit 1 — "Full Inicio change (routing, sidebar, icon, footer exclusion)" — complete, atomic, landed in one batch per tasks.md's explicit no-partial-landing note
- Boundary: starts from the RED test-writing (Phase 1) through the full-suite REFACTOR/verify (Phase 3); Phase 4 (spec-delta merge) intentionally excluded, deferred to `sdd-archive`
- Estimated review budget impact: actual diff is well within the 400-line authored-line budget — both route moves show as zero-diff renames; the `n8n/faf-workflow.json` modification visible in `git status` is pre-existing/unrelated to this change and was not touched by this apply batch

## Status
14/15 tasks complete (Phases 1–3 fully done; Phase 4/task 4.1 intentionally deferred to `sdd-archive` per repo convention, not a pending-work item). Ready for verify.
