# Archive Report: Multi-Market Navigation Shell (market-nav-redesign)

**Change**: market-nav-redesign
**Archived**: 2026-08-18
**Branches**: 4 stacked branches (NOT YET merged to main)
- `market-nav-redesign/pr1-routing-skeleton` (commit `8c841a1`, off `main`)
- `market-nav-redesign/pr2-sidebar` (commit `f96ebf8`, off PR1)
- `market-nav-redesign/pr3-placeholder-pages` (commit `c648c87`, off PR2)
- `market-nav-redesign/pr4-mobile-drawer` (commit `8980e24`, off PR3, tip of the stack)

**Status**: COMPLETE — SDD cycle closed, artifacts archived, Strict TDD verification PASS

---

## What Was Built

Today the dashboard was a single bare route (`/dashboard`) with no market concept — that worked only because Criptomonedas (crypto) is the sole market with real backend data. `new_dashboard_example/` presented a sidebar mockup listing ~11 markets, signaling intended future scope. This change introduces that navigation shell now — architecturally honest about what's real today — so future markets have a defined home without pretending they exist. Only Criptomonedas is functional; every other market is a genuine, navigable "próximamente" (coming-soon) state, not a decoration.

### Locked product decisions (user-confirmed, not re-litigated)

1. **Visual identity: Adapt, not Replace.** Kept IBM Plex Sans/Mono and the existing 5-token `@theme` block (`--color-buy/sell/inactive/muted/threshold`). The mockup's Inter/JetBrains Mono + ~50-token MD3 palette was reference-only, never ported. `DecisionCard`, `ScoreGauge`, `Sparkline`, `RecommendationBadge`, `DirectionFilter` kept their existing styling.
2. **Non-functional menu items ship as real, clickable "próximamente" placeholder pages**, reusing `ServiceUnavailable.tsx`/`EmptyState.tsx` conventions (dashed border, `role="status"`, honest Spanish copy) — never disabled/greyed-out links.
3. **Sidebar architecture: real Next.js routes per market** (`/dashboard/crypto` + `/dashboard/{market-slug}` per placeholder), not client-side `selectedMarket` state — bookmarkable, correct back-button semantics.
4. **Gauge fidelity: kept the dual-needle `ScoreGauge` exactly as-is** (both σ⁺ and σ⁻ real values). The mockup's single-needle-plus-fixed-reference simplification was explicitly rejected as an information-loss regression against the `decision-dashboard` spec's existing gauge requirement.

### Orchestrator defaults (resolved, flagged for correction if wrong — none were flagged)

5. Mobile nav: hamburger/drawer overlay revealing the same sidebar content on mobile, without regressing the current functional mobile single-column dashboard.
6. Tier 2 (drill-down/graph/narrative): unchanged behavior, only re-mounted under the new page layout.
7. Responsive breakpoints: kept the current `sm:grid-cols-2 lg:grid-cols-3` (not the mockup's `md:grid-cols-2`).
8. Filter wiring: the existing, already-functional `DirectionFilter` (`role="group"`, `aria-pressed`, real `onClick`) ships — never the mockup's static unwired markup.
9. Accessibility baseline for the sidebar: `aria-current="page"` on the active market link, a `<nav aria-label="...">` landmark, visible keyboard focus states.
10. Icon dependency: no Google Material Symbols CDN — self-contained inline SVG icons, consistent with the app's zero-third-party-CDN posture.

### Product questions resolved (proposal defaults accepted, no correction requested)

1. Placeholder pages ship with **no CTA / no interest-capture affordance** — purely informational.
2. Mockup's existing grouping/order (**MERCADOS PRINCIPALES / MERCADO ARGENTINO**) kept as-is, no roadmap-priority reordering.
3. Standard effort/polish — no demo-specific polish pass.

### Mockup-vs-app differences resolved (15 catalogued during exploration)

Exploration (`sdd/market-nav-redesign/explore`, observation 1550) catalogued 15 concrete differences between `new_dashboard_example/` and the current app: (1) entirely new left sidebar nav with two grouped sections, (2) sidebar was desktop-only in the mockup with zero mobile equivalent — this change adds a real mobile drawer, (3) app title block relocation into the sidebar, (4) content header eyebrow/heading restyle, (5) ALL/BUY/SELL filter mockup was unwired plain markup — the real, already-functional `DirectionFilter` ships instead, (6) grid breakpoint mismatch (`md` vs. `sm`/`lg`) — current breakpoints kept, (7) card content restyle (same IA), (8) **gauge semantics differ, not just style** — mockup's single-needle-plus-fixed-reference would have silently dropped σ⁺/σ⁻ information; dual-needle kept, (9) gap/sparkline/theta layout differences, (10) footer differences, (11) typography/CDN swap — rejected, IBM Plex self-hosted stays, (12) full MD3 ~50-token palette — rejected, current 5-token block stays, (13) card surface/border hex differences, (14) zero non-happy-path states in the mockup — this change adds real placeholder, loading, and empty states, (15) Tailwind-CDN mockup delivery — not integrable as-is, all tokens manually re-derived from the existing build.

### Architecture

- `app/(dashboard)/layout.tsx` + shared components/lib (`Sidebar.tsx`, `MarketPlaceholder.tsx`, `icons.tsx`, `lib/markets.ts`) — the pre-existing route group, contributes zero URL segments.
- `app/dashboard/` — new real (non-parenthesized) segment hosting every routable file: `layout.tsx`, `page.tsx` (redirect shim), `crypto/page.tsx` (moved `OverviewClient` tree, unchanged behavior), `[market]/page.tsx` (dynamic segment, `MARKETS` lookup, `notFound()` on unknown slug).
- `lib/markets.ts`: single source of truth (`MARKETS` record + `MARKET_GROUPS` order) driving both the sidebar list and the placeholder route lookup.
- 12 hand-authored inline SVG icon components (`icons.tsx`) — zero package/CDN import.
- `Sidebar.tsx`: single `'use client'` component owning both desktop nav and mobile hamburger/drawer state via a shared `MarketLinkGroups` sub-component (no duplicated JSX between desktop and mobile).

---

## Notable Mid-Implementation Finding: Route Group vs. Real Segment Correction

During Phase 1 (PR1) implementation, a genuine Next.js App Router gotcha was discovered and corrected, worth documenting explicitly since it is the most consequential deviation from `design.md`'s literal file paths.

**The gotcha**: `app/(dashboard)` is a Next.js *route group* — a parenthesized folder name contributes **zero URL segments**. It has always mapped to `/`, never to `/dashboard`. `design.md`'s sketched paths (`app/(dashboard)/crypto/page.tsx`, `app/(dashboard)/[market]/page.tsx`, wiring `<Sidebar/>` into `app/(dashboard)/layout.tsx`) would, if implemented literally, have resolved to `/crypto` and `/[market]` — not `/dashboard/crypto` and `/dashboard/{market}` as every spec scenario requires verbatim.

**The correction** (applied during PR1, task 1.3, and carried forward through PR2–PR4): every routable file was placed under a new, real (non-parenthesized) `app/dashboard/` segment (`app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `app/dashboard/crypto/page.tsx`, `app/dashboard/[market]/page.tsx`). This real segment imports shared, non-route modules (`Sidebar.tsx`, `MarketPlaceholder.tsx`, `icons.tsx`, `lib/markets.ts`) from the pre-existing `app/(dashboard)/` route group via the `@/` alias — those shared files never moved, only the routable page/layout files did.

**Independent re-verification**: this correction was not trusted from documentation or code comments alone. `sdd-verify` independently re-confirmed it live via `curl` against a real `next dev` server: `/` → 307 → `/dashboard/crypto`; `/dashboard` → 307 → `/dashboard/crypto`; `/dashboard/crypto` → 200; `/dashboard/acciones` → 200; `/dashboard/not-a-real-market` → 404. All five routes resolved exactly as the spec requires.

Each PR that touched a routable file (PR2 task 2.6, PR3 task 3.3) carries an explicit "routing correction from PR1 (read before starting)" note in `tasks.md`, so the correction propagated correctly through the entire 4-PR stack rather than being fixed once and silently drifting.

---

## Verification Summary

Per `verify-report.md` (observation 1558, verified at HEAD `8980e24`, `market-nav-redesign/pr4-mobile-drawer`, off `main` at `3c2160a`, cumulative PR1–PR4):

- **Verdict**: PASS
- **Blockers**: 0
- **Critical findings**: 0
- **Requirements verified**: 10/10 (6 `market-navigation`, 4 `decision-dashboard` delta)
- **Scenarios verified**: 17/17 (12 `market-navigation`, 5 `decision-dashboard` delta) — all COMPLIANT
- **Tasks**: 26/26 complete (Phase 1: 7, Phase 2: 8, Phase 3: 4, Phase 4: 3, Phase 5: 4), confirmed by independent on-disk read of `tasks.md`
- **Tests**: 251/251 passing — 223 Vitest (36 test files) + 28 Playwright (12 `dashboard.spec.ts` + 16 `market-nav.spec.ts`). Both commands independently re-run by `sdd-verify`, not copied from apply-progress self-reports.
- **Build**: `npx tsc --noEmit` — clean, exit 0
- **CRITICAL**: 0
- **WARNING**: 0
- **SUGGESTION** (2, both non-blocking): (1) the root `/` redirect to `/dashboard/crypto` has no dedicated e2e scenario (only bare `/dashboard` is spec-required and tested) — not a spec gap, `tasks.md` task 1.4 explicitly calls it a zero-cost bonus, independently curl-verified live; recommend a one-line e2e assertion in a future maintenance pass. (2) `market-nav.spec.ts`'s viewport-inversion assertions couple to Tailwind breakpoint classes rather than a semantic viewport API — consistent with existing codebase convention, informational only.

**No `[MANUAL-VERIFICATION-ONLY]` scenarios exist in this change.** Every scenario across both spec domains is either directly Playwright/Vitest-testable, or backed by an independently reproducible static `git diff`, `curl`, or `grep` check. Unlike the recent `n8n-fetch-klines-item-fix` change, this change has zero live-external-instance dependency, so the clean PASS carries no "functionally unverified until confirmed" caveat (per Engram decision 1544's scope: that caveat applies only when an unconfirmed manual live-confirmation scenario exists, which is not the case here).

One methodology note from `verify-report.md`: a first Playwright re-run showed 2 transient failures caused by the verify session running a second, separate `next dev` process concurrently against the same shared `.next` build directory while independently curl-testing routes. After clearing `.next` and re-running in isolation, the full 28/28 suite passed cleanly twice in a row — a verification-session artifact, not an implementation defect.

### TDD Compliance: 6/6 checks passed

TDD evidence present (apply-progress Phase 4 table + `tasks.md` per-task RED/GREEN narration for Phases 1–3); every implementation task paired with a RED test task; RED test files independently confirmed to exist; GREEN confirmed via 251/251 independently re-run passing tests; adequate triangulation (e.g. 8 distinct mobile-drawer scenarios); safety net confirmed for `Sidebar.tsx`'s PR4 modification (prior PR2/PR3 scenarios re-confirmed passing before the PR4 batch).

---

## Spec Compliance

### `market-navigation` (NEW domain — 6 requirements, 12 scenarios)

| Requirement | Scenario | Result |
|---|---|---|
| Sidebar navigation shell | All markets listed in the correct groups | COMPLIANT |
| Sidebar navigation shell | Active market visually indicated | COMPLIANT |
| Per-market routing | Crypto route hosts the real dashboard | COMPLIANT |
| Per-market routing | Non-crypto market route renders the placeholder | COMPLIANT |
| Per-market routing | Bare /dashboard never 404s | COMPLIANT |
| Placeholder-market page | Placeholder shows honest unavailable copy, no CTA | COMPLIANT |
| Placeholder-market page | Placeholder testably distinct from other empty/unavailable states | COMPLIANT |
| Mobile navigation drawer | Drawer exposes the same links as desktop | COMPLIANT |
| Mobile navigation drawer | Mobile dashboard still usable without the drawer open | COMPLIANT |
| Sidebar accessibility baseline | aria-current marks the active market | COMPLIANT |
| Sidebar accessibility baseline | Nav landmark and keyboard focus are present | COMPLIANT |
| No new third-party CDN/font dependency | No new external font/icon CDN reference | COMPLIANT |

### `decision-dashboard` delta (MODIFIED — 4 ADDED requirements, 5 scenarios)

| Requirement | Scenario | Result |
|---|---|---|
| Crypto dashboard route under market navigation | Overview mounts at the canonical crypto route | COMPLIANT |
| Crypto dashboard route under market navigation | Bare /dashboard redirects to the canonical route | COMPLIANT |
| Dual-needle gauge survives the navigation redesign | Both needles still render under the new shell | COMPLIANT |
| Card-grid breakpoints unchanged by the navigation redesign | Grid still switches at sm/lg, not md | COMPLIANT |
| DirectionFilter wiring unchanged by the navigation redesign | Filter remains functional under the new shell | COMPLIANT |

**Compliance summary**: 17/17 scenarios compliant, 10/10 requirements — matches `verify-report.md` exactly.

### Spec correction applied mid-cycle

`sdd-design` discovered a transcription error in `specs/market-navigation/spec.md`'s "Sidebar navigation shell" requirement (CEDEARs had been merged into "ETFs / CEDEARs" under MERCADOS PRINCIPALES, leaving MERCADO ARGENTINO with only 2 items). Per Engram observation 1554, this was corrected to match `new_dashboard_example/code.html` (ground truth) and `proposal.md`'s explicit 10-item list: **MERCADOS PRINCIPALES** = 7 items (Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs — no CEDEARs); **MERCADO ARGENTINO** = 3 items (CEDEARs first, then Dólar y Cotizaciones, Plazo Fijo y Locales). The archived `specs/market-navigation/spec.md` and the merged `openspec/specs/market-navigation/spec.md` both carry this corrected wording, matching the implementation (`lib/markets.ts`, independently confirmed against the on-disk spec by `sdd-verify`) and the test suite. Engram observation 1552 (the original spec save) is stale on this one point; observation 1554 is the superseding correction note, both recorded below for traceability.

---

## Delivery Route

**Branches (4 stacked, NOT YET merged to main)**:
- `market-nav-redesign/pr1-routing-skeleton` — commit `8c841a1`, off `main`
- `market-nav-redesign/pr2-sidebar` — commit `f96ebf8`, off PR1
- `market-nav-redesign/pr3-placeholder-pages` — commit `c648c87`, off PR2
- `market-nav-redesign/pr4-mobile-drawer` — commit `8980e24`, off PR3 (tip of the stack, contains all cumulative PR1–PR4 changes)

`tasks.md`'s "Delivery Route Recommendation" section recommends **stacked-to-main**, matching this repo's `dashboard-ux`/`dynamic-asset-count` precedent, and flags the repo's known GitHub gotcha: GitHub does not reliably auto-retarget an open stacked PR's base branch when the PR it was stacked on merges to `main` — each unit's branch must be manually rebased/recreated onto the freshly-updated `main` after its predecessor merges, and the diff re-verified to show only that unit's changes before requesting review.

**Status**: Archiving the SDD artifacts is independent from the git delivery step. This archive phase performed only the mechanical folder move and spec merge — it did **not** merge, push, or open any PRs for the 4 branches. The merge/push/PR-chain decision belongs to the orchestrator; the user has already confirmed "4 PRs encadenados a main" as the delivery strategy, matching the established `dynamic-asset-count` pattern.

---

## Artifacts Archived

| Artifact | Location | Status |
|---|---|---|
| proposal.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/proposal.md` | Moved |
| exploration.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/exploration.md` | Moved |
| design.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/design.md` | Moved |
| tasks.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/tasks.md` | Moved (26/26 complete) |
| specs/market-navigation/spec.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/specs/market-navigation/spec.md` | Moved (full new-domain spec) |
| specs/decision-dashboard/spec.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/specs/decision-dashboard/spec.md` | Moved (delta) |
| verify-report.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/verify-report.md` | Moved |
| archive-report.md | `openspec/changes/archive/2026-08-18-market-nav-redesign/archive-report.md` | Written (this file) |

**Verification**: Mechanical move via `git mv` (tasks.md was git-tracked; `proposal.md`, `design.md`, `exploration.md`, `specs/`, `verify-report.md` were untracked working-tree files, all moved together with the same operation). Verified with an empty `diff -r` against a pre-move recursive snapshot — byte-identity confirmed. Source folder `openspec/changes/market-nav-redesign/` confirmed absent post-move.

---

## Delta Specs Merged

| Domain | Action | Details |
|---|---|---|
| market-navigation | Created (NEW domain) | Mechanical `cp`/`mv` of the full delta spec (already a complete new-domain spec, ADDED-only, no prior main-spec state to diff against) into `openspec/specs/market-navigation/spec.md`. Verified with empty `diff -r`. 6 requirements, 12 scenarios. |
| decision-dashboard | Modified (delta merged) | 4 ADDED requirements (Crypto dashboard route under market navigation; Dual-needle gauge survives the navigation redesign; Card-grid breakpoints unchanged by the navigation redesign; DirectionFilter wiring unchanged by the navigation redesign) appended to `openspec/specs/decision-dashboard/spec.md`'s existing requirement set. Existing requirements (Card overview, Tier 2 drill-down, LLM narrative/graph confinement, No-data UX, Multi-asset display) preserved untouched. Verified via `git diff --stat`: 42 insertions, 0 deletions (additive-only). |

**Merge Locations**: `openspec/specs/market-navigation/spec.md` (new) and `openspec/specs/decision-dashboard/spec.md` (updated in-place, now 9 requirements total: 5 pre-existing + 4 new).

---

## Engram Observation IDs (for traceability)

| Artifact | Observation ID | Topic Key |
|---|---|---|
| exploration | 1550 | sdd/market-nav-redesign/explore |
| proposal | 1551 | sdd/market-nav-redesign/proposal |
| spec | 1552 | sdd/market-nav-redesign/spec |
| spec correction note | 1554 | (manual save, supersedes 1552 on the sidebar grouping requirement) |
| design | 1553 | sdd/market-nav-redesign/design |
| tasks | 1555 | sdd/market-nav-redesign/tasks (topic-key upsert, revision 5 — stale re: Phase 4/5 status; on-disk `tasks.md` at archive time is authoritative and shows 26/26 complete) |
| apply-progress | 1556 | sdd/market-nav-redesign/apply-progress (topic-key upsert, 4th revision — Phases 1–3 detail superseded, RED/GREEN narration preserved verbatim in `tasks.md`) |
| verify-report | 1558 | sdd/market-nav-redesign/verify-report |
| archive-report | (new) | sdd/market-nav-redesign/archive-report |

**Note on stale intermediate snapshots**: Engram observation 1555 (`tasks`, revision 5) shows Phase 4 and Phase 5 as "NOT STARTED" — this reflects the state at the time of its last upsert, after PR3 landed but before PR4/Phase 5 work began. It is a stale intermediate snapshot, not the final state. Per the Final-State Authority hierarchy, the on-disk `openspec/changes/market-nav-redesign/tasks.md` (read directly at archive time, and by `sdd-verify` independently) is authoritative and shows all 26/26 tasks complete across Phases 1–5. This archive report reflects that final state, not the stale Engram snapshot.

---

## Final State Gates

**Task Completion Gate**: All 26 implementation/verification tasks (Phases 1–5) confirmed complete via direct on-disk read of `tasks.md` at archive time — no stale unchecked checkboxes. `sdd-verify`'s independent read (observation 1558) corroborates the same 26/26 count.

**Spec Merge Gate**: `market-navigation` created as a new domain (6 requirements, 12 scenarios, mechanically copied, empty `diff -r`). `decision-dashboard`'s 4 ADDED requirements merged additively into the existing 5-requirement main spec (`git diff --stat`: 42 insertions, 0 deletions) — now 9 requirements total.

**Mechanical Archive Gate**: Folder moved via `git mv` from `openspec/changes/market-nav-redesign/` to `openspec/changes/archive/2026-08-18-market-nav-redesign/`, verified with empty `diff -r` against a pre-move recursive snapshot (byte-identity confirmed); source folder confirmed absent.

**Verification Gate**: PASS with 0 CRITICAL, 0 WARNING, 2 non-blocking SUGGESTIONs; 10/10 requirements and 17/17 scenarios COMPLIANT; 251/251 tests passing (223 Vitest + 28 Playwright), independently re-run by `sdd-verify`, not copied from self-reports.

**Spec Compliance Gate**: All 10/10 requirements across both domains verified; 17/17 scenarios with passing test evidence; the mid-implementation routing correction (route group vs. real segment) independently re-verified live via `curl`.

---

## Archive Closure

This change is **closed and archived**. The 4 stacked branches (`pr1-routing-skeleton` → `pr2-sidebar` → `pr3-placeholder-pages` → `pr4-mobile-drawer`) are implementation-complete and verification-complete, but **NOT YET merged to main, not pushed, and no PRs have been opened** — that git delivery work is intentionally out of scope for this archive phase and belongs to the orchestrator's next step. The delta specs have been merged into `openspec/specs/market-navigation/spec.md` (new) and `openspec/specs/decision-dashboard/spec.md` (updated), and this report completes the SDD cycle.
