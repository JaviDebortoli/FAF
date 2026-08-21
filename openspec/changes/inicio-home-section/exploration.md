# Exploration: inicio-home-section

## Current State

**Routing.** `app/dashboard/page.tsx` and `app/(dashboard)/page.tsx` both `redirect('/dashboard/crypto')` — the former serves the bare `/dashboard` URL (real, non-parenthesized segment), the latter serves `/` (the parenthesized `(dashboard)` route group contributes no URL segment, so it has always mapped to `/`). `app/dashboard/crypto/page.tsx` is a static sibling segment that Next.js resolves ahead of the dynamic `app/dashboard/[market]/page.tsx` catch-all for an exact `/dashboard/crypto` match (confirmed static-over-dynamic precedence, already tested in `tests/e2e/market-nav.spec.ts` "static route precedence" case). `[market]/page.tsx` looks up `MARKETS[slug]`, calls `notFound()` for unknown slugs, and renders `<DashboardHeader>` + `<MarketPlaceholder>` for the 9 non-crypto slugs.

**Sidebar (`app/(dashboard)/components/Sidebar.tsx`, 141 lines, `'use client'`).** `MarketLinkGroups({ activeSlug, onLinkClick })` is a shared sub-component (extracted specifically to avoid duplicating link JSX with active-state class logic) rendered identically by the desktop `<nav>` and the mobile drawer. Each market link: `<Link href="/dashboard/{slug}" data-testid="sidebar-link-{slug}" aria-current={active ? 'page' : undefined} className="flex items-center gap-3 rounded-md border-r-2 px-3 py-2 text-sm transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-100 " + (active ? 'border-buy bg-buy/10 font-semibold text-buy' : 'border-transparent text-zinc-400 hover:bg-zinc-900')"><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></Link>`. `activeSlug = pathname?.split('/')[2] ?? 'crypto'`. The branding block (`data-testid="sidebar-branding"`, "Plataforma FAF" + subtitle) is duplicated verbatim in both the desktop `<nav>` and the mobile drawer's `<nav>` (NOT extracted into a shared component) — this is the file's own precedent for what does and doesn't get extracted: static two-line text blocks stay duplicated, but link markup with active-state logic gets its own shared function.

**Icons (`app/(dashboard)/components/icons.tsx`, 161 lines).** Hand-drawn inline SVG set, explicit "no package or CDN dependency" decision. Shared `DEFAULTS = { width:24, height:24, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, strokeLinecap:'round', strokeLinejoin:'round' }`. 12 icons exported via `Icons = {...}`. No Home/House icon exists.

**Layout (`app/dashboard/layout.tsx`, Server Component, no `'use client'`).** Renders `<div className="flex min-h-screen"><Sidebar /><div className="flex-1 pb-48 md:pl-64">{children}</div><footer data-testid="dashboard-footer" className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950 py-4 md:left-64">...</footer></div>`. Footer renders unconditionally for every route under this layout. `pb-48` on the content wrapper exists solely to reserve space above the fixed footer.

**Content precedent for Inicio copy.** `DashboardHeader`'s `showDisclaimer` paragraph (rendered on crypto and every placeholder route): "Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA." The removed old footer copy ("σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67") is spec-banned verbatim from the DOM (`market-navigation` "Shared shell footer" requirement: "MUST be fully removed and MUST NOT appear anywhere in the DOM") but the underlying θ=0.67 / σ/γ/ρ *concepts* are fine to reference in new wording.

## Affected Areas

- `app/dashboard/inicio/page.tsx` (new) — the Inicio route, static sibling to `crypto/`, same precedence guarantee.
- `app/dashboard/page.tsx`, `app/(dashboard)/page.tsx` — redirect target `/dashboard/crypto` → `/dashboard/inicio`.
- `app/(dashboard)/components/Sidebar.tsx` — insert an Inicio link between branding and `MarketLinkGroups` in both nav surfaces; `activeSlug` fallback.
- `app/(dashboard)/components/icons.tsx` — new hand-drawn Home icon.
- `app/dashboard/layout.tsx` — footer must not render on Inicio; architecture decision below.
- `openspec/specs/market-navigation/spec.md` — 2 MODIFIED requirements ("Sidebar navigation shell", "Shared shell footer").
- `openspec/specs/decision-dashboard/spec.md` — 1 MODIFIED requirement ("Crypto dashboard route under market navigation").
- `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts` — redirect-target rewrite, group-order test fix, new footer-absence test, new Inicio tests.

## Design Questions

### 1–2. Route placement and redirect targets — CONFIRMED

`app/dashboard/inicio/page.tsx` (static sibling of `crypto/page.tsx`, same non-parenthesized `app/dashboard/` segment) is correct: Inicio needs a real, non-placeholder page and is not in `MARKETS`, so it cannot go through `[market]/page.tsx`. Both `app/dashboard/page.tsx` and `app/(dashboard)/page.tsx` must change `redirect('/dashboard/crypto')` → `redirect('/dashboard/inicio')`.

### 3. Exact spec text requiring MODIFIED deltas

`openspec/specs/market-navigation/spec.md`, requirement **"Per-market routing"**:
> "The system MUST expose `/dashboard/crypto` as the only market route hosting the real decision dashboard. Every other market MUST have its own route (`/dashboard/{market-slug}`) that renders a shared placeholder page. Bare `/dashboard` MUST NOT 404 and MUST land the user on a working crypto view."

Scenario "Bare /dashboard never 404s": "...THEN they MUST land on a working crypto view (via redirect or route-group index), never a 404". This scenario's assertion changes from "crypto view" to "Inicio view" — MODIFIED, not ADDED.

`openspec/specs/decision-dashboard/spec.md`, requirement **"Crypto dashboard route under market navigation"**:
> "The Tier 1 card overview MUST mount under the canonical crypto market route (`/dashboard/crypto`) instead of bare `/dashboard`. Bare `/dashboard` MUST redirect or alias to this canonical route so the existing bookmark keeps working."

Scenario "Bare /dashboard redirects to the canonical route": "...THEN they MUST end up viewing the same Tier 1 card overview, without a 404..." — this destination assertion also needs a MODIFIED delta (bare `/dashboard` now lands on Inicio, not the Tier 1 overview directly).

Also root `/` is currently untested by any e2e spec (no `page.goto('/')` assertion found) — a new test should be added rather than an existing one modified.

### 4. Sidebar `activeSlug` fallback

`pathname?.split('/')[2] ?? 'crypto'` — `usePathname()` from `next/navigation` is typed nullable but in practice is non-null once the client component mounts inside the App Router; this is defensive/type-driven, not a reachable runtime branch today. Recommendation: still update the fallback to `'inicio'` for consistency with the new default, since leaving it as `'crypto'` would be a stale/misleading literal once Inicio is the actual default — low-risk, low-cost correctness fix, not because the branch is provably reachable.

### 5. Sidebar insertion — extract a shared `InicioLink`, don't inline-duplicate

The file's own precedent draws the line at complexity: the branding block (static 2-line text) stays duplicated, but `MarketLinkGroups` was extracted specifically because link markup carries active-state conditional logic. An Inicio link has that same active-state logic (comparing `activeSlug === 'inicio'`), so by the file's own established reasoning it should NOT be inlined twice — recommend a small `InicioLink({ activeSlug, onLinkClick })` function alongside `MarketLinkGroups`, called once in the desktop `<nav>` and once in the mobile drawer, mirroring exactly why `MarketLinkGroups` itself was extracted.

### 6. Home icon (new, in `icons.tsx`)

Recommended, matching the existing minimalist line style (`DEFAULTS`, no fill, `currentColor` stroke):
```tsx
export function Home(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}
```
Roofline + walls + door, same visual weight as `Bank`. `sdd-design`/`sdd-apply` may refine the exact coordinates but this is a reasonable, ready-to-use starting point.

### 7. Styling — reuse market-link classes exactly

User confirmed "las mismas estetica" = visually identical to a market link. Recommendation: the new `InicioLink` should use the exact same className string/active-state ternary as `MarketLinkGroups`'s `<Link>` (`border-buy bg-buy/10 font-semibold text-buy` active / `border-transparent text-zinc-400 hover:bg-zinc-900` inactive), same `data-testid="sidebar-link-inicio"` pattern, same icon+label layout — not a structurally distinct treatment, just outside the `MARKET_GROUPS` data loop.

### 8. Footer visibility — architectural decision (flagged for design.md)

Three options investigated:

**A — `'use client'` + `usePathname()` conditional in `layout.tsx`.** Rejected: regresses this codebase's explicit, documented preference for server-rendered static chrome (`crypto/page.tsx`'s own comment: "static chrome ... rendered server-side so it is present even if hydration fails") — the footer is exactly this kind of static chrome, and this option makes its presence hydration-dependent for every route, not just Inicio.

**B — Route-group split: `app/dashboard/(with-footer)/{crypto,[market]}/` with its own nested layout carrying `<footer>` + `pb-48`; outer `app/dashboard/layout.tsx` keeps only `<Sidebar/>` + a plain `flex-1 md:pl-64` wrapper (no footer, no pb-48); `app/dashboard/inicio/page.tsx` sits outside the group.** Files touched: `app/dashboard/layout.tsx` (remove footer/pb-48), new `app/dashboard/(with-footer)/layout.tsx` (footer + pb-48), move `crypto/page.tsx` and `[market]/page.tsx` under the new group (route group contributes no URL segment, so `/dashboard/crypto` and `/dashboard/{market}` are unaffected; static-over-dynamic precedence for `crypto` vs `[market]` is unaffected since it's evaluated at the same effective URL depth regardless of which route group wraps them, mirroring the existing precedent already tested for exactly this pair). `pb-48` moves cleanly into the nested layout since its only purpose was reserving space above the (now conditionally-present) footer. `dashboard-footer` testid is preserved verbatim so existing e2e assertions on crypto/placeholder routes keep passing unmodified.

**C — Per-page opt-in: extract a `<DashboardFooter/>` Server Component, call it explicitly at the bottom of `crypto/page.tsx` and `[market]/page.tsx`; remove footer/pb-48 from `layout.tsx`; add `pb-48` directly to each page's own `<main>` className.** Works visually (footer is `position:fixed`, independent of React-tree depth) with less file-moving than B (no route-group directory restructuring). Rejected as the *primary* recommendation, though technically simpler: `market-navigation/spec.md`'s "Shared shell footer" requirement contains the explicit sentence "This footer MUST NOT be duplicated per-page (**one shared instance, inherited from the shell**)." Per-page explicit invocation contradicts "inherited from the shell" literally, and gives up the current architecture's "impossible to forget on a new market route" guarantee (every future market slug automatically gets the footer via the shared `[market]/page.tsx` + its enclosing layout; a `<DashboardFooter/>` call could be silently omitted on a future route).

**Recommendation: Option B.** It is the only option that (a) keeps every layout a Server Component, matching this codebase's established value, and (b) genuinely preserves "one shared instance, inherited from the shell" — just narrowing the shell's membership to exclude Inicio, rather than replacing shell-inheritance with per-page opt-in. This is flagged explicitly as design.md's decision to finalize, but the concrete migration list above (which files move, what changes in each, why `pb-48` transfers cleanly, why testids are unaffected) should let design.md skip re-investigation.

### 9. Test-impact catalog

`tests/e2e/dashboard.spec.ts`:
- **"Bare /dashboard redirect" test (`navigating to bare /dashboard lands on the crypto view, never a 404`)** — MUST be rewritten: currently asserts `toHaveURL(/\/dashboard\/crypto$/)` and checks a BTCUSDT decision card is visible after the redirect. New behavior: bare `/dashboard` lands on `/dashboard/inicio` (no decision cards there); the existing crypto-card assertions should move to a separate, direct `/dashboard/crypto` visit or a "click the Criptomonedas CTA from Inicio" flow.
- No existing test currently visits `/` — a new test should be added asserting `/` → `/dashboard/inicio`, since none needs modification.

`tests/e2e/market-nav.spec.ts`:
- **"Sidebar — group order" test** — currently asserts `nav.locator('[data-testid^="sidebar-link-"]')` matching exactly `[...MERCADOS_PRINCIPALES, ...MERCADO_ARGENTINO]` testids in order. Once `sidebar-link-inicio` exists inside the same `<nav>`, this locator will also match it and the exact-array-equality assertion will FAIL unless the expected list is updated to prepend `'inicio'`. MUST be updated.
- **"aria-current" test** — iterates only `MERCADOS_PRINCIPALES`/`MERCADO_ARGENTINO` slugs for the negative assertion ("no other market link has aria-current"); unaffected as-is (doesn't check Inicio), but a dedicated positive/negative Inicio `aria-current` test should be added.
- **"Sidebar branding" test** — unaffected in content; could be extended or left alone (Inicio insertion is between branding and market groups, so the existing "branding is the first element above market groups" assertion still holds — Inicio is between them, not displacing branding).
- **Footer tests** (`Shared dashboard footer` describe block: identical-copy-across-routes, old-copy-absent, no-overlap) — all target `/dashboard/crypto` and `/dashboard/acciones`; unaffected by the footer-visibility change since neither route loses the footer. A NEW test is needed: "Inicio route renders no `dashboard-footer` element."
- `tests/unit/markets.test.ts` — unaffected; Inicio is deliberately NOT added to `MARKETS`/`MARKET_GROUPS`, and every existing assertion in this file is scoped to those two exports only.

### 10. Draft Inicio placeholder content

Grounded in `DashboardHeader`'s existing disclaimer wording and the paper's σ/γ/ρ/θ=0.67 framing (without resurrecting the spec-banned exact old-footer sentence):

```
<h1>Bienvenido a la Plataforma FAF</h1>
<p>FAF (Marco Argumentativo Financiero) es un framework de decisión determinístico:
cada recomendación BUY/SELL se deriva combinando evidencia técnica (γ, ρ) sobre un
umbral fijo θ = 0.67, sin texto generado por IA en el cálculo central de la decisión.</p>
<p>Actualmente el único mercado con datos reales en producción es Criptomonedas —
el resto de los mercados listados en el menú lateral son vistas "próximamente".</p>
<Link href="/dashboard/crypto">Ver panel de Criptomonedas →</Link>
```
Heading + 2 short paragraphs + a CTA link/button to `/dashboard/crypto`, reusing the deterministic/no-AI framing already established for `showDisclaimer` and referencing σ/γ/ρ/θ=0.67 without hardcoding a numeric example (matches "deterministic, no AI-generated numbers for the core decision" framing the user asked for). `sdd-design`/`sdd-apply` should treat this as a starting draft, not final copy.

## Spec Conflicts Confirmed

11. `market-navigation/spec.md` "Shared shell footer" (verbatim, needs a MODIFIED delta carving out an Inicio exception):
> "The system MUST render exactly one footer, shared across every `/dashboard/*` route (both `/dashboard/crypto` and every placeholder-market route), containing this exact copy verbatim: [...]. This footer MUST NOT be duplicated per-page (one shared instance, inherited from the shell). [...]"

This currently says "every `/dashboard/*` route" with no exception — Inicio requires carving out a documented exception, hence MODIFIED not ADDED.

12. `market-navigation/spec.md` "Sidebar navigation shell" ALSO needs a MODIFIED delta (not just additive), because of this exact sentence:
> "The system MUST render a persistent sidebar `<nav>` displaying a branding header [...] as the first element, above the market groups [...]. **Below the branding header, the sidebar MUST list exactly these markets**, grouped into two labeled sections in this order: [...]"

"Below the branding header, the sidebar MUST list exactly these markets" literally means nothing sits between branding and the market groups today. Inserting an Inicio link there contradicts that literal wording even though it's conceptually additive — this requirement's text itself must change to describe the new branding → Inicio → market-groups order, or it will read as spec-violating even after a correct implementation.

No other requirement asserting "identical sidebar across all routes" was found that would conflict with adding Inicio; it is otherwise a pure addition to the sidebar's rendered content.

## Recommendation

Adopt: `app/dashboard/inicio/page.tsx` (static route) + both redirects retargeted + extracted `InicioLink` sub-component reusing `MarketLinkGroups`'s exact classNames + hand-drawn `Home` icon + Option B route-group restructuring for footer exclusion + 3 MODIFIED spec deltas (2 in `market-navigation/spec.md`, 1 in `decision-dashboard/spec.md`) + the test updates cataloged above. This is a medium-sized change (new route + icon + sidebar edit + layout restructuring + 3 spec deltas) and should not be forced smaller, but is also fully scoped — no backend/data-model changes, no new dependencies.

## Risks

- Option B (route-group restructuring) touches 4 files (2 moved, 2 layout edits) instead of 1 — larger diff than the footer problem alone would suggest, but necessary to preserve "inherited from the shell" and Server Component chrome.
- The "Sidebar navigation shell" spec MODIFIED delta is easy to under-scope if `sdd-spec` only touches "Shared shell footer" and misses that "Below the branding header, the sidebar MUST list exactly these markets" also needs updated wording — flagged explicitly above so it isn't missed.
- `tests/e2e/dashboard.spec.ts`'s bare-`/dashboard` test requires a non-trivial rewrite (not just a URL string swap) since its post-redirect assertions currently depend on decision-card content that won't exist on Inicio.
- No test currently covers `/` (root) at all — this is a coverage gap independent of this change, worth closing now since Inicio makes root more user-visible as the actual landing page.

## Ready for Proposal

Yes. Scope, affected files, spec deltas, and test impact are all concretely identified; the one open architectural call (footer visibility mechanism) has a clear, justified recommendation (Option B) ready for design.md to ratify or override.
