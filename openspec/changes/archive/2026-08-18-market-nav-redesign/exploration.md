# Exploration: market-nav-redesign

## Current State

**Routing/shell**: Next.js 15 App Router, single route group `app/(dashboard)/page.tsx` — no other route segments exist besides API routes (`app/api/decisions/route.ts`, `app/api/decisions/[asset]/narrative/route.ts`, `app/api/cycle/route.ts`). There is no market/category concept anywhere: `src/domain/types.ts`'s `Decision`/`DecisionReport` have no `market` field, only `asset: Asset` (a raw string like `"BTCUSDT"`). `page.tsx` is a Server Component rendering static chrome (header/footer) + the `OverviewClient` client island (only client component in the tree).

**Data flow**: `OverviewClient.tsx` owns a `ViewState` machine (`loading | unavailable | ready`), polls `GET /api/decisions` every 30s (`POLL_INTERVAL_MS`), diffs `decision.t` per asset for a "changed since last poll" ring highlight, and filters via `selectActionable(report, direction)` (`Direction = 'ALL' | 'BUY' | 'SELL'`, in `lib/select.ts`). It renders `DirectionFilter`, a card grid of `DecisionCard`, `EmptyState`/`ServiceUnavailable` for zero-data states, and mounts `DrilldownPanel` (Tier 2 modal: `ArgumentGraph` + `ThesisScores` + lazy-fetched `NarrativePanel`) only when a card is clicked. None of this reads or needs a "market" dimension today.

**Design system**: `app/layout.tsx` loads IBM Plex Sans + IBM Plex Mono via `next/font/google` (self-hosted, no CDN), exposed as `--font-plex-sans`/`--font-plex-mono` CSS vars. `app/globals.css`'s `@theme` block (Tailwind v4) defines only 5 semantic tokens: `--color-buy` (#22c55e), `--color-sell` (#f43f5e), `--color-inactive` (#52525b), `--color-muted` (#a1a1aa), `--color-threshold` (#eab308) — everything else uses raw Tailwind `zinc-*` utilities directly in component classNames, not semantic tokens. Body bg `#09090b`. Dark-only, no toggle. `ScoreGauge` (`lib/gauge.ts`) is the signature element: a semicircular SVG gauge that draws the background arc, an amber θ tick (`--color-threshold`), and **both** `needlePlusPath` (σ⁺, buy color) and `needleMinusPath` (σ⁻, sell color, opacity 0.85) positioned by their real computed values — this dual-needle rendering is how the dashboard visually satisfies the current spec's "gauge comparing σ(μ⁺) and σ(μ⁻) against θ=0.67" requirement.

**Existing empty/unavailable conventions** (`dynamic-asset-count` change): `EmptyState` (`variant: 'no-active' | 'filtered'`) for "data exists but nothing qualifies", `ServiceUnavailable` (`reason: 'no-data' | 'error'`) for "no cached report at all" — both share visual language (dashed border, `role="status"`, Spanish copy) but are deliberately separate `data-testid`s so tests never conflate them. Both are pure/no-`'use client'` presentational components.

**Spec of record**: `openspec/specs/decision-dashboard/spec.md` (from archived `dashboard-ux`, modified by `dynamic-asset-count`) contracts: Tier 1 card overview (BUY/SELL only, gauge comparing σ⁺/σ⁻ vs θ, sparkline, direction filter, empty state), Tier 2 drill-down (fixed 8/2/1 topology graph + lazy narrative), Tier 1 stays fully deterministic (no LLM text, no interactive graph — narrowed exemption for Tier 2 only per D7), no-data UX (architecture-agnostic copy, must not name n8n/cache/pull/cycle), multi-asset display driven entirely by n8n's last push (no source-code-defined asset list). None of this spec currently says anything about navigation, sidebar, or market categories.

**Backend scope**: confirmed crypto-only end-to-end — `src/market/{assets,binance,provider}.ts` are Binance-specific, `app/api/cycle/route.ts` and the n8n workflow only ever push Binance USDT-pair candles, and the entire L1 (`src/rdf`) → L4 (`src/decision`) argumentation pipeline operates on that one data shape. There is zero backend capability today for stocks, forex, bonds, commodities, indices, ETFs, CEDEARs, or ARS-market instruments.

**Test conventions**: Playwright e2e (`tests/e2e/dashboard.spec.ts`) stubs `GET /api/decisions` and `GET /api/decisions/[asset]/narrative` via `page.route` — never a live `POST /api/cycle` round-trip. Component `data-testid`s follow a strict pattern (`decision-card-{asset}`, `direction-filter-{option}`, `drilldown-panel-{asset}`, `empty-state`, `service-unavailable`).

## Mockup Catalog (`new_dashboard_example/`) vs. current app

1. **Left sidebar nav** (`aside.hidden.md:flex`, fixed `w-64`) — entirely new. Two grouped sections ("MERCADOS PRINCIPALES": Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs; "MERCADO ARGENTINO": CEDEARs, Dólar/Cotizaciones, Plazo Fijo/Locales), icon+label items. Only "Criptomonedas" is active-styled (green text, `bg-primary-container/10`, right border accent, bold). All are `<a href="#">` — no real hrefs, no `aria-current`, no click handlers, no disabled state.
2. **Sidebar is desktop-only, zero mobile equivalent**: `hidden md:flex`; below 768px there is no hamburger/drawer/fallback anywhere in the HTML — the whole nav (including the active-market indicator) is unreachable on mobile.
3. App title block "Plataforma FAF" + tagline moves into the sidebar (was inline in current header).
4. Content header: eyebrow "FAF · PANEL DE DECISIONES" (dot separator) — same info as current eyebrow, different type treatment. `<h1>` becomes dynamic per market ("Criptomonedas") vs. current static "Recomendaciones activas". Subheading is a near-duplicate reworded disclaimer.
5. **ALL/BUY/SELL filter** restyled (pill container, active tab solid bg) vs. current `DirectionFilter` (border-divided group, `role="group"`, `aria-pressed`, wired `onClick`). Mockup version is **plain unwired `<button>`** markup — no state, "ALL" hardcoded active, BUY/SELL do nothing.
6. **Grid breakpoint differs**: mockup `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; current `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
7. **Card content is the same IA, restyled**: name + BUY/SELL chip (same visual grammar as `RecommendationBadge`'s `border-buy/40 bg-buy/10 text-buy` + dot, different radius/padding), gauge, gap value, θ value (mockup adds a triangle icon; current is plain text), sparkline.
8. **Gauge semantics differ, not just style**: mockup draws only ONE colored needle (matching card direction) plus a FIXED dashed reference line (always `x1=50,y1=50,x2=50,y2=15`, not derived from any real value) — it does not encode both σ⁺ and σ⁻ magnitudes. Current `ScoreGauge`/`lib/gauge.ts` always renders BOTH needles positioned by real computed σ values. A literal mockup port would silently drop information the current spec explicitly requires ("gauge comparing σ(μ⁺) and σ(μ⁻)") — a mechanics gap, not just a skin change.
9. **Layout of gap/sparkline/theta differs**: mockup groups gap-label + sparkline bottom-left, θ+icon bottom-right; current stacks a full-width gap/θ text row then a full-width `Sparkline` below.
10. **Footer**: mockup's is `fixed bottom-0` spanning `md:left-64`, adds personal attribution; current footer is static in-flow, different copy (mentions σ, γ, ρ, θ=0.67 explicitly).
11. **Typography swap**: Inter + JetBrains Mono (Google Fonts CDN `<link>`) + Material Symbols Outlined icon font (CDN) vs. current self-hosted IBM Plex Sans/Mono via `next/font/google`, zero icon-font dependency today.
12. **Full MD3-style color token set** (~50 tokens: `surface-container-*`, `on-surface(-variant)`, `primary/secondary/tertiary(-container/-fixed)`, plus fintech tokens `bg-deep`, `surface-card`, `border-subtle`, `text-primary/secondary/muted`, `buy-accent`, `sell-accent`, `warning-theta`) vs. current's 5-token minimal `@theme` block layered on raw `zinc-*` utilities.
13. **Card surface/border hex differs**: `bg-surface-card` (#16191E) / `border-border-subtle` (#2D323B) vs. current `bg-zinc-950`/`border-zinc-800` — same dark-card family, different exact values.
14. **Zero non-happy-path states in the mockup**: no loading, no empty state, no service-unavailable, no drill-down/modal, no `NarrativePanel`, no `ArgumentGraph` — 8 hardcoded cards, always "ready". Tier 2 UX under the new nav shell is entirely unaddressed.
15. **Tailwind delivery differs**: mockup loads Tailwind via CDN with an inline `tailwind.config`, disconnected from the project's real Tailwind v4 build (`@theme`/PostCSS) — not integrable code as-is; every token must be manually re-derived.

## Affected Areas

- `app/(dashboard)/page.tsx` — needs a sidebar shell wrapper (layout-level) and possibly per-market routing.
- `app/(dashboard)/components/OverviewClient.tsx` — would need to own/receive a `selectedMarket` dimension if nav is client state, or be re-mounted per route if nav is real routes.
- `app/(dashboard)/components/DecisionCard.tsx`, `ScoreGauge.tsx`, `Sparkline.tsx`, `RecommendationBadge.tsx` — restyle targets; `ScoreGauge`/`lib/gauge.ts` also has the dual-needle-vs-single-needle semantic question above.
- `app/(dashboard)/components/DirectionFilter.tsx` — restyle target only, already fully functional.
- `app/(dashboard)/components/EmptyState.tsx`, `ServiceUnavailable.tsx` — restyle targets; natural home for a "market not yet supported" state.
- `app/(dashboard)/components/DrilldownPanel.tsx`, `ArgumentGraph.tsx`, `NarrativePanel.tsx`, `ThesisScores.tsx` — Tier 2 surfaces; mockup says nothing about them, behavior under the new shell is undefined.
- `app/layout.tsx`, `app/globals.css` — font family and `@theme` token changes (if visual identity is replaced or partially adopted).
- `openspec/specs/decision-dashboard/spec.md` — delta spec target; currently zero nav/market/sidebar requirements, so this adds new requirement sections.
- No changes needed to: `src/rdf`, `src/stream`, `src/laf`, `src/decision`, `src/cycle`, `src/market`, `app/api/*`, `lib/{scores,select,gauge,sparkline,graphLayout}.ts` (confirmed no `market` field exists in `Decision`/`DecisionReport`, so nothing downstream of `GET /api/decisions` needs restructuring beyond the new nav shell itself).

## Approaches Compared

### Concern 1 — Visual identity: replace vs. adapt

1. **Replace** — swap IBM Plex → Inter/JetBrains Mono, adopt `DESIGN.md`'s full token set into `@theme`, restyle all Tier 1/2 components.
   - Pros: mockup ports faithfully; single coherent design language; `DESIGN.md` is complete and well-specified.
   - Cons: touches every existing component (9+ files) — large, highly-visible diff; abandons the just-established `dashboard-ux` design rationale; risks the 400-changed-line PR review budget, needs chained-PR planning.
   - Effort: High.
2. **Adapt (keep IBM Plex, restyle layout/nav only)** — add sidebar/market concept using the current token set; treat `DESIGN.md` as inspiration only.
   - Pros: minimal blast radius (Card/Gauge/Sparkline/Badge need zero or near-zero changes); preserves existing design rationale; small safe diff; sidesteps the gauge information-loss issue automatically.
   - Cons: doesn't fulfill "port this mockup" literally; visual gap vs. the reference screenshot may disappoint if a full re-skin was intended; still need new tokens for nav-only elements.
   - Effort: Low–Medium.

   Real unresolved fork — not something to silently pick.

### Concern 2 — Non-functional menu items UX

1. **Disabled/greyed-out, no click handler**.
   - Pros: cheapest; honest; no new component.
   - Cons: can look unfinished/broken; no discoverability of "why" without a tooltip.
   - Effort: Low.
2. **Clickable → explicit "próximamente" placeholder** (reuses `ServiceUnavailable`-style language, distinct copy), consistent with `EmptyState.tsx`/`ServiceUnavailable.tsx` conventions.
   - Pros: most consistent with existing empty-state pattern (`data-testid`, `role="status"`, Spanish copy); most honest; testable; extensible later.
   - Cons: needs real per-market routing/state plus a new component and spec scenarios; more effort.
   - Effort: Low–Medium.

### Concern 3 — Sidebar architecture: real routes vs. client state

Verified: app has exactly one route today — no precedent either way; first-time architectural decision.

1. **Real Next.js routes** (`/dashboard/crypto`, `/dashboard/stocks`, etc.).
   - Pros: bookmarkable/shareable URLs; correct back-button semantics for free; matches the sidebar's implied "destination" semantics; easy to extend per-market later.
   - Cons: introduces routing/layout restructuring the app has never had; non-crypto routes must resolve to the "coming soon" state at the routing layer; more e2e surface; must decide canonical crypto URL (breaking change vs. current bare `/dashboard` bookmark unless a redirect is added).
   - Effort: Medium.
2. **Client-side state** (`selectedMarket` in `OverviewClient` or a new shell, same URL).
   - Pros: minimal surface — no new routes/layout; `OverviewClient` barely changes; fastest; keeps `/dashboard` bookmark stable.
   - Cons: no bookmarking/sharing a market view; back button doesn't step through sections, contradicting what a sidebar visually promises; harder to reconcile once a second market gets real data later.
   - Effort: Low.

   Currently low-stakes since only crypto has content, but this materially changes once a second market ships — a real future-proofing tradeoff, not a "pick fastest" decision.

## Recommendation

No single approach is silently recommended for Concern 1 — it is a product-identity call outside this agent's authority. Investigation supports:

- **Concern 1**: lean **Adapt**, not Replace — the `dashboard-ux` design system was deliberately, recently established with documented rationale in this repo; a full re-skin has materially larger blast radius/review risk for a change whose primary payload is navigation, not visuals; card content/IA is confirmed unchanged by the user, so in-place restyling is lower risk. Flag as an explicit decision for `sdd-propose`, not a default.
- **Concern 2**: **Coming-soon placeholder** (option 2) — most consistent with existing empty-state conventions, only marginally more effort than disabled-only, more honest and testable.
- **Concern 3**: **Real routes** (option 1) if a second market is eventually planned (the ~10 modeled-but-inert menu items strongly suggest this); pay the routing cost once now while there's only one real market and no bookmarks to migrate. If crypto-only is confirmed permanent, client-state is the pragmatic minimal choice.

## Risks

- Visual identity fork left unresolved reaches `sdd-propose` undecided — must be an explicit blocking question, not silently defaulted.
- Gauge semantics regression: a literal port of the mockup's single-needle gauge silently violates the current spec's "gauge comparing σ(μ⁺) and σ(μ⁻)" requirement — must be called out regardless of the visual-identity decision.
- URL/bookmark breakage if real routes are chosen and the canonical crypto route isn't `/dashboard` itself — not addressed by the mockup.
- Mobile nav has no reference design at all — a naive port ships a nav-less mobile experience, a regression vs. today's mobile-fine single-column dashboard.
- Tier 2 (drill-down/graph/narrative) UX under the new shell is completely unspecified by the mockup.
- PR review budget risk: Replace touches 9+ files, likely exceeding the 400-changed-line default budget — `sdd-tasks` would need chained/stacked PR slices.
- Accessibility gaps in the mockup itself: no `aria-current`, no visible focus-state styling shown, `<nav>` has no `aria-label`; disabled/placeholder items need a defined a11y treatment the mockup doesn't specify.
- Icon font dependency: mockup relies on Google Material Symbols Outlined via CDN — a new third-party/CDN dependency the current app has none of (IBM Plex is self-hosted); must be resolved (self-host vs. CDN vs. swap to an SVG icon approach, none currently exists in the project).

## Ready for Proposal

Yes, with explicit open questions the user must resolve in `sdd-propose` (do not let the proposal phase default any of these silently):

1. Visual identity: Replace (full `DESIGN.md` port) or Adapt (keep IBM Plex + current tokens, restyle nav/layout only)?
2. Non-functional menu items: disabled/no-click, coming-soon placeholder (recommended), or another treatment? Exact copy/register?
3. Sidebar architecture: real routes per market (recommended if a second market is planned) or client-side `selectedMarket` state? If routes: canonical crypto URL and does `/dashboard` need a redirect?
4. Gauge fidelity: keep current dual-needle (σ⁺ and σ⁻ both real) restyled as-is, or adopt the mockup's single-needle-plus-fixed-reference simplification (and if so, does the spec's "comparing σ(μ⁺) and σ(μ⁻)" requirement need to change)?
5. Mobile nav pattern: design one (hamburger/drawer), or accept "desktop-only nav, mobile keeps today's chromeless view" as interim scope?
6. Tier 2 (drill-down/graph/narrative) treatment under the new shell: unchanged behavior wrapped by new chrome, or does the modal/overlay need to adapt to the sidebar's presence?
7. Exact responsive breakpoint behavior beyond the mockup's single `md` cutoff — does the card grid keep today's `sm`/`lg` breakpoints, or align to the mockup's `md`/`lg`?
8. Filter wiring: confirm the ALL/BUY/SELL control gets `DirectionFilter`'s real wiring (not the mockup's static markup) — should be an explicit spec scenario given the mockup ships it non-functional.
9. Accessibility requirements for the sidebar: `aria-current`, `<nav>` landmark/`aria-label`, keyboard focus-visible states, and a defined a11y pattern for whichever Concern 2 option is chosen.
10. Icon dependency resolution: self-host Material Symbols, replace with an existing/new SVG icon approach, or accept the CDN dependency.

Given the scope and number of open questions, `sdd-propose` should treat this as a multi-decision proposal (likely with a "Resolved:" section per decision, mirroring the archived `dashboard-ux`/`dynamic-asset-count` proposal style) rather than a single default path.
