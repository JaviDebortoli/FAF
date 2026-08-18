# Tasks: Multi-Market Navigation Shell

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~800-900 total (7 new files, 2 modified files, 1 optional unit test, 1 new/expanded e2e suite) |
| 400-line budget risk | High (total); Low-Medium per individual work unit once split into 4 |
| Chained PRs recommended | Yes |
| Suggested split | PR1 routing skeleton + redirect + `lib/markets.ts` + crypto move -> PR2 `Sidebar` desktop + `icons.tsx` + a11y -> PR3 `MarketPlaceholder` + placeholder routes -> PR4 mobile drawer + full `market-nav.spec.ts` |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (recommended — see Delivery Route Recommendation) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Routing skeleton: bare `layout.tsx` (no Sidebar yet), `page.tsx` → `redirect()`, `crypto/page.tsx` (moved `OverviewClient` tree), `lib/markets.ts` config | PR1 | `npx vitest run tests/unit/markets.test.ts` | `npx playwright test tests/e2e/dashboard.spec.ts` (route + redirect assertions) | Revert `app/(dashboard)/{layout,page}.tsx`, delete `crypto/`, `lib/markets.ts`; no other unit depends on nothing existing yet |
| 2 | `Sidebar.tsx` (desktop-only) + `icons.tsx`, wire `<Sidebar/>` into `layout.tsx`, a11y baseline | PR2 | `npx playwright test tests/e2e/market-nav.spec.ts -g "desktop\|a11y\|CDN"` | `npx playwright test tests/e2e/market-nav.spec.ts` | Revert `Sidebar.tsx`, `icons.tsx`, and `layout.tsx`'s `<Sidebar/>` wiring back to PR1's bare passthrough; crypto route still works |
| 3 | `MarketPlaceholder.tsx` + `[market]/page.tsx`, placeholder e2e scenarios | PR3 | `npx playwright test tests/e2e/market-nav.spec.ts -g "placeholder"` | `npx playwright test tests/e2e/market-nav.spec.ts` | Revert `MarketPlaceholder.tsx`, delete `[market]/`; sidebar links to non-crypto markets 404 again, no regression to crypto/redirect |
| 4 | Mobile hamburger/drawer in `Sidebar.tsx`, remaining `market-nav.spec.ts` drawer scenarios | PR4 | `npx playwright test tests/e2e/market-nav.spec.ts -g "drawer\|mobile"` | `npx playwright test tests/e2e/market-nav.spec.ts` | Revert drawer markup/state in `Sidebar.tsx` and drawer test block; desktop nav (PR2/PR3) unaffected |

## Phase 1: Routing Skeleton, Redirect, Market Config (PR1)

- [x] 1.1 RED `tests/unit/markets.test.ts`: `MARKET_GROUPS` == exactly `[{label:"MERCADOS PRINCIPALES", slugs:[acciones,crypto,renta-fija,forex,commodities,indices,etfs]}, {label:"MERCADO ARGENTINO", slugs:[cedears,dolar,plazo-fijo]}]` (7 + 3, CEDEARs first in the second group, matching the corrected `specs/market-navigation/spec.md`); every slug in `MARKET_GROUPS` exists as a key in `MARKETS`; no duplicate slugs; `MARKETS.crypto` present.
- [x] 1.2 GREEN `app/(dashboard)/lib/markets.ts`: `interface Market { slug: string; label: string; icon: keyof typeof Icons }`; `MARKETS: Record<string, Market>` (10 entries, slugs per design: acciones, crypto, renta-fija, forex, commodities, indices, etfs, cedears, dolar, plazo-fijo); `MARKET_GROUPS` with the two groups/order from 1.1. **Deviation**: `icon` typed as `string`, not `keyof typeof Icons` — `components/icons.tsx` doesn't exist until PR2; typing against it now breaks `tsc --noEmit` in isolation. Icon names already assigned per design's mapping; PR2 should tighten the type once `icons.tsx` lands. Also added `isReal: boolean` (true only for `crypto`) per the orchestrator's explicit minimum-shape instruction — additive, not in design.md's sketch but consistent with it.
- [x] 1.3 Create crypto route hosting `OverviewClient` verbatim (unchanged `OverviewClient` tree/behavior). **Deviation (routing correction, see "Deviations from Design" in apply-progress)**: lives at `app/dashboard/crypto/page.tsx`, not `app/(dashboard)/crypto/page.tsx` as design.md specified — `app/(dashboard)` is a Next.js route group and contributes no URL segment, so that path would have resolved to `/crypto`, not `/dashboard/crypto` as every spec scenario requires verbatim.
- [x] 1.4 GREEN redirect shim to `/dashboard/crypto`. **Deviation**: implemented at `app/dashboard/page.tsx` (the real `/dashboard` URL) — see 1.3's routing-correction note. `app/(dashboard)/page.tsx` (the pre-existing root-mapped `/` route) was also kept as the same redirect, purely for root-bookmark backward compatibility; not required by spec but zero-cost and zero-duplication.
- [x] 1.5 Create bare passthrough layout for this PR, no `<Sidebar/>` yet — PR2 wires it in. **Deviation**: `app/dashboard/layout.tsx` (real segment) alongside the pre-existing `app/(dashboard)/layout.tsx` (unchanged bare passthrough, now only wrapping the root redirect) — see 1.3's routing-correction note.
- [x] 1.6 RED `tests/e2e/dashboard.spec.ts`: updated all route assertions from `/` to `/dashboard/crypto`; added "bare /dashboard redirects to /dashboard/crypto without 404" scenario (`Bare /dashboard redirect` describe block).
- [x] 1.7 Verify GREEN: `npx vitest run tests/unit/markets.test.ts` (6/6 pass) + `npx playwright test tests/e2e/dashboard.spec.ts` (12/12 pass) + `npx tsc --noEmit` (clean). Full suites also re-run clean: `npx vitest run` (223/223) + `npx playwright test` (12/12).

## Phase 2: Sidebar Desktop Nav, Icons, Accessibility (PR2)

> **Routing correction from PR1 (read before starting)**: `app/(dashboard)` is a Next.js *route group* (parenthesized folder name) — it contributes NO URL segment and has always mapped to `/`, never `/dashboard`. PR1 verified this against the live dev server and corrected the routing accordingly: the real `/dashboard`, `/dashboard/crypto` (and future `/dashboard/{market}`) URLs are served from a new, real (non-parenthesized) `app/dashboard/` segment (`app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `app/dashboard/crypto/page.tsx`), which imports shared, non-route modules (`components/*.tsx`, `lib/*.ts`) from the pre-existing `app/(dashboard)/` route group via the `@/` alias — those files did not move. **Task 2.6 below ("wire `<Sidebar/>` into `app/(dashboard)/layout.tsx`") must target `app/dashboard/layout.tsx` instead** — wiring it into `app/(dashboard)/layout.tsx` would only affect the root `/` redirect shim, not the real `/dashboard/*` routes the sidebar needs to appear on. `Sidebar.tsx`/`icons.tsx` themselves can still live under `app/(dashboard)/components/` unchanged (they're not route files). See PR1's apply-progress (`sdd/market-nav-redesign/apply-progress`) for full detail.

- [x] 2.1 RED `tests/e2e/market-nav.spec.ts` (new file) — desktop group scenarios: "MERCADOS PRINCIPALES" lists the 7 slugs from 1.1 in order, "MERCADO ARGENTINO" lists the 3 slugs (CEDEARs first) in order; Criptomonedas link visually distinguished on `/dashboard/crypto`. Confirmed RED (element-not-found timeouts) before implementing `Sidebar.tsx`.
- [x] 2.2 RED same file — a11y scenarios: Criptomonedas link has `aria-current="page"`, no other link does; sidebar wrapped in `<nav aria-label="Mercados">`; tabbing to a link shows a visible `focus-visible` outline. Confirmed RED alongside 2.1.
- [x] 2.3 RED same file — CDN scenario: rendered `<head>` has no new Google Fonts `<link>` or third-party CDN `<script>`/`<link>` beyond what `app/layout.tsx` already loads. **Note**: this scenario passed even pre-implementation (it's a structural regression check with no dependency on the Sidebar existing) — expected, not a TDD violation; the other 4 scenarios in this file were confirmed RED.
- [x] 2.4 GREEN `app/(dashboard)/components/icons.tsx`: inline SVG components (24x24, `stroke="currentColor"`) for `TrendingUp`, `Coins`, `Bank`, `Swap`, `Box`, `BarChart`, `PieChart`, `Receipt`, `DollarSign`, `Lock`, `Menu`, `Close` — no package/CDN import. `Menu`/`Close` included now per design.md grouping all icons in one file; Phase 4/PR4 is the first to wire them into `Sidebar.tsx`'s mobile drawer.
- [x] 2.5 GREEN `app/(dashboard)/components/Sidebar.tsx` (`'use client'`, desktop-only in this PR): `usePathname()` → `activeSlug`; render `MARKET_GROUPS` as labeled `<nav aria-label="Mercados">` link lists; active link gets `aria-current="page"` + `border-r-2 border-buy bg-buy/10 text-buy font-semibold`; inactive gets `text-zinc-400 hover:bg-zinc-900`; all links get `focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-100` and `data-testid="sidebar-link-{slug}"`. Sidebar itself is `hidden md:fixed md:flex md:w-64` — hidden below `md:` since no mobile trigger exists yet (Phase 4 adds it), preventing a mobile regression per proposal.md decision 5.
- [x] 2.6 Wire `<Sidebar/>` into `app/dashboard/layout.tsx` (**corrected target**, not `app/(dashboard)/layout.tsx` — see the routing-correction note above task 2.1 and PR1's apply-progress), replacing PR1's bare passthrough; added `md:pl-64` offset to the content wrapper.
- [x] 2.7 Verify GREEN: `npx playwright test tests/e2e/market-nav.spec.ts` (5/5) + `npx playwright test tests/e2e/dashboard.spec.ts` (12/12, no regression) + `npx tsc --noEmit` (clean). Full suites also re-run clean: `npx vitest run` (223/223) + `npx playwright test` (17/17 combined).
- [x] 2.8 (additive) Tightened `app/(dashboard)/lib/markets.ts`'s `Market.icon` type from `string` to `keyof typeof Icons`, closing PR1's flagged deviation now that `icons.tsx` exists — type-only change, zero value changes needed.

## Phase 3: Placeholder Pages (PR3)

> **Routing correction from PR1 (read before starting)**: task 3.3's `[market]/page.tsx` must live at `app/dashboard/[market]/page.tsx` (the real segment), not `app/(dashboard)/[market]/page.tsx` — see Phase 2's routing-correction note above and PR1's apply-progress for full detail. `MarketPlaceholder.tsx` (3.2) can still live under `app/(dashboard)/components/` unchanged (not a route file).

- [x] 3.1 RED `tests/e2e/market-nav.spec.ts` — placeholder scenarios: clicking a non-crypto link (e.g. Acciones) navigates to `/dashboard/{slug}` and renders the placeholder instead of decision data; copy is Spanish and states the market is not yet available; page contains no link/button/form for "notify me" or interest capture (no CTA, per proposal defaults); placeholder `data-testid="market-placeholder"` is distinct from `service-unavailable` and `empty-state`. Also added: `/dashboard/crypto` still renders the real dashboard (static-vs-dynamic route precedence regression guard) and an unknown market slug resolves to a 404. Confirmed RED: 2/4 new scenarios failed (`market-placeholder` not found) before implementing; the crypto-precedence and unknown-slug-404 scenarios passed pre-implementation (both already true — no `[market]` route existed yet, so any non-crypto/non-existent slug already 404'd) — expected, not a TDD violation, same pattern as PR2's task 2.3 note.
- [x] 3.2 GREEN `app/(dashboard)/components/MarketPlaceholder.tsx` (server, pure): props `{ marketLabel: string }`; `data-testid="market-placeholder" role="status"`, dashed-border block (same convention as `ServiceUnavailable`/`EmptyState`), copy `"{marketLabel} todavía no está disponible en la plataforma."`, zero CTA markup.
- [x] 3.3 GREEN `app/dashboard/[market]/page.tsx` (**corrected target**, real segment — not `app/(dashboard)/[market]/page.tsx`, see the routing-correction note above): look up `MARKETS[params.market]` (Next 15 async `params`); `notFound()` if absent; else render `<MarketPlaceholder marketLabel={market.label} />`. Verified static `crypto/` segment still takes precedence over the sibling dynamic `[market]` segment for the exact `/dashboard/crypto` match, per the new e2e regression test.
- [x] 3.4 Verify GREEN: `npx playwright test tests/e2e/market-nav.spec.ts` (9/9) + `npx tsc --noEmit` (clean). Full suites also re-run clean: `npx vitest run` (223/223) + `npx playwright test` (21/21 combined: 12 dashboard.spec.ts + 9 market-nav.spec.ts).

## Phase 4: Mobile Drawer (PR4)

- [x] 4.1 RED `tests/e2e/market-nav.spec.ts` — added `Mobile navigation drawer` describe block, 7 scenarios at a `375x812` viewport (`below md breakpoint`) plus 1 at the default desktop viewport (`at/above md breakpoint`): hamburger visible/desktop-nav-hidden inversion, drawer opens listing the same groups/markets/order as desktop, close via close button, close via backdrop click, close via link click + navigation, no-regression of `/dashboard/crypto` mobile content with the drawer closed, and the exact inverse assertion at desktop viewport. Confirmed RED: 6/7 new scenarios failed (`sidebar-mobile-toggle`/`sidebar-desktop-nav`/`sidebar-mobile-drawer` testids did not exist yet); the "no regression" scenario passed pre-implementation for the same documented structural reason as PR2 task 2.3 and PR3 task 3.1 (it only asserts pre-existing crypto-page behavior plus the absence of a not-yet-existing testid) — not a TDD violation.
- [x] 4.2 GREEN `app/(dashboard)/components/Sidebar.tsx`: extracted `MarketLinkGroups` (shared market-list rendering, reused verbatim by both desktop nav and the mobile drawer — no duplicated JSX); added `useState` `mobileOpen`; hamburger `<button data-testid="sidebar-mobile-toggle" className="... md:hidden">` (top-right, `fixed`, using `Icons.Menu`) opens the drawer; drawer (`data-testid="sidebar-mobile-drawer"`, `md:hidden`) renders a backdrop (`data-testid="sidebar-mobile-backdrop"`) plus a `<nav aria-label="Mercados">` panel with a close button (`data-testid="sidebar-mobile-close"`, `Icons.Close`) and `MarketLinkGroups`; closes on close-button click, backdrop click, and link click/navigation (`onLinkClick` prop). Added `data-testid="sidebar-desktop-nav"` to the existing desktop `<nav>` for its exact-inverse-visibility assertion. Because the drawer's `<nav aria-label="Mercados">` is conditionally rendered only while `mobileOpen`, exactly one "Mercados" nav landmark is ever mounted at a time — no strict-mode ambiguity for Phase 2/3's existing `page.getByRole('navigation', { name: 'Mercados' })` assertions.
- [x] 4.3 Verify GREEN: `npx playwright test tests/e2e/market-nav.spec.ts -g "Mobile navigation drawer"` (7/7) → full `npx playwright test tests/e2e/market-nav.spec.ts` (16/16: 9 from PR2/PR3 + 7 new) → `npx tsc --noEmit` (clean) → full `npx vitest run` (223/223, 36 files, unchanged) → full `npx playwright test` (28/28 combined: 12 `dashboard.spec.ts` + 16 `market-nav.spec.ts`, no regression).

## Phase 5: Final Verification — Spec Scenario Self-Check

| Spec | Scenario | Confirmed by |
|---|---|---|
| market-navigation | All markets listed in the correct groups | `market-nav.spec.ts` desktop group scenario (2.1) |
| market-navigation | Active market visually indicated | `market-nav.spec.ts` (2.1) + `aria-current` (2.2) |
| market-navigation | Crypto route hosts the real dashboard | `dashboard.spec.ts` route update (1.6) |
| market-navigation | Non-crypto market route renders the placeholder | `market-nav.spec.ts` placeholder scenario (3.1) |
| market-navigation | Bare /dashboard never 404s | `dashboard.spec.ts` redirect scenario (1.6) |
| market-navigation | Placeholder shows honest unavailable copy, no CTA | `market-nav.spec.ts` (3.1) |
| market-navigation | Placeholder testably distinct from other empty/unavailable states | `market-nav.spec.ts` `data-testid` assertion (3.1) |
| market-navigation | Drawer exposes the same links as desktop | `market-nav.spec.ts` drawer scenario (4.1) |
| market-navigation | Mobile dashboard still usable without the drawer open | `market-nav.spec.ts` (4.1) + `dashboard.spec.ts` mobile check (4.3) |
| market-navigation | aria-current marks the active market | `market-nav.spec.ts` (2.2) |
| market-navigation | Nav landmark and keyboard focus are present | `market-nav.spec.ts` (2.2) |
| market-navigation | No new external font/icon CDN reference | `market-nav.spec.ts` CDN scenario (2.3) |
| decision-dashboard (delta) | Overview mounts at the canonical crypto route | `dashboard.spec.ts` route update (1.6) |
| decision-dashboard (delta) | Bare /dashboard redirects to the canonical route | `dashboard.spec.ts` redirect scenario (1.6) |
| decision-dashboard (delta) | Both needles still render under the new shell | `dashboard.spec.ts` existing gauge assertions, unchanged, re-run under `/dashboard/crypto` (1.6/1.7) |
| decision-dashboard (delta) | Grid still switches at sm/lg, not md | `dashboard.spec.ts` existing breakpoint assertions, unchanged (1.6/1.7) |
| decision-dashboard (delta) | Filter remains functional under the new shell | `dashboard.spec.ts` existing `DirectionFilter` assertions, unchanged (1.6/1.7) |

- [x] 5.1 Run full suite: `npx vitest run` (223/223, 36 files) + `npx tsc --noEmit` (clean) + `npx playwright test` (28/28: 12 `dashboard.spec.ts` + 16 `market-nav.spec.ts`) — all green against a real `next dev` server, zero regressions across the 4-PR stack.
- [x] 5.2 Grep repo for `md3`, `Material Symbols`, `fonts.googleapis.com/icon` (case-insensitive, `app/`, `src/`, `tests/`) — zero matches confirmed (proposal decision 10 / no-CDN success criterion).
- [x] 5.3 Confirmed `app/globals.css` has zero diff vs. the pre-PR1 baseline (`git diff 3c2160a -- app/globals.css`, empty output) across all 4 PRs (proposal decision 1 — no new `@theme` tokens needed).
- [x] 5.4 Confirmed `ScoreGauge.tsx`, `app/(dashboard)/lib/gauge.ts`, `DirectionFilter.tsx`, `DecisionCard.tsx`, `Sparkline.tsx`, `RecommendationBadge.tsx`, `DrilldownPanel.tsx`, `ArgumentGraph.tsx`, `NarrativePanel.tsx`, `ThesisScores.tsx` all have zero diff vs. the pre-PR1 baseline (single `git diff 3c2160a --stat` call across all 10 paths, empty output) — explicit no-op check per design's "Unchanged" file list. Additionally confirmed `OverviewClient.tsx` (dual-needle `ScoreGauge` + `sm:grid-cols-2 lg:grid-cols-3` host) is also zero-diff, and `tests/dashboard/lib/gauge.test.ts`'s 7 unit tests independently cover both `needlePlusPath`/`needleMinusPath` computation, confirming the dual-needle requirement is genuinely (not just assumedly) still covered.

## Delivery Route Recommendation

**Recommendation: stacked-to-main**, matching this repo's `dashboard-ux`/`dynamic-asset-count` precedent (sequential PRs merged to `main`). Each of the 4 units above is independently revertable and ships a coherent slice (routing → desktop nav → placeholders → mobile drawer), so a feature-tracker branch would add coordination overhead without a matching benefit.

**Required manual-retarget step (this repo's known GitHub gotcha)**: GitHub does not reliably auto-retarget an open stacked PR's base branch when the PR it was stacked on merges to `main`. Do not rely on GitHub's automatic base-branch update. After each unit merges (PR1 → PR2 → PR3 → PR4), the orchestrator/apply step MUST manually rebase (or recreate) the next branch onto the freshly-updated `main` and re-verify the diff shows only that unit's changes before requesting review — this is a required step in the chain, not optional cleanup.

## Implementation Order

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5. Phase 1 must land first — it establishes `lib/markets.ts` (consumed by Phase 2's `Sidebar` and Phase 3's `[market]/page.tsx`) and the `layout.tsx`/redirect skeleton every later phase wires into. Phase 3 depends on Phase 2's `layout.tsx` wiring (placeholder pages render inside the same shell). Phase 4 depends on Phase 2's `Sidebar.tsx` (extends it, does not replace it). Phase 5 is the terminal cross-spec check, run only after all 4 PRs have merged.
