# market-navigation Specification

## Purpose

Defines the multi-market sidebar navigation shell: grouped market links, per-market routing, the "próximamente" placeholder-market page pattern, mobile drawer nav, and the accessibility baseline for all of it. Only Criptomonedas has real backend data; every other market is a genuine, navigable not-yet-available state.

## Requirements

### Requirement: Sidebar navigation shell

The system MUST render a persistent sidebar `<nav>` displaying a branding header — title "Plataforma FAF" and subtitle "Recomendaciones financieras explicables en tiempo real" — as the first element, above the market groups, in both the desktop sidebar and the mobile drawer. Below the branding header, the sidebar MUST list exactly these markets, grouped into two labeled sections in this order: "MERCADOS PRINCIPALES" (Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs) and "MERCADO ARGENTINO" (CEDEARs, Dólar y Cotizaciones, Plazo Fijo y Locales). Grouping and order MUST match the mockup (`new_dashboard_example/code.html`) as-is (no roadmap-priority reordering). The link corresponding to the currently active market MUST be visually distinguished from inactive links.

#### Scenario: Branding header renders above market groups, desktop and mobile
- GIVEN the dashboard shell renders
- WHEN the desktop sidebar mounts
- THEN it MUST show "Plataforma FAF" and "Recomendaciones financieras explicables en tiempo real" as the first element, above both market groups
- WHEN the mobile drawer opens
- THEN it MUST also show both texts as the first element, above the market groups

#### Scenario: All markets listed in the correct groups
- GIVEN the dashboard shell renders
- WHEN the sidebar mounts
- THEN "MERCADOS PRINCIPALES" MUST list Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs, in that order
- AND "MERCADO ARGENTINO" MUST list CEDEARs, Dólar y Cotizaciones, Plazo Fijo y Locales, in that order

#### Scenario: Active market visually indicated
- GIVEN the user is viewing `/dashboard/crypto`
- WHEN the sidebar renders
- THEN the Criptomonedas link MUST be visually distinguished from the other links

### Requirement: Shared shell footer

The system MUST render exactly one footer, shared across every `/dashboard/*` route (both `/dashboard/crypto` and every placeholder-market route), containing this exact copy verbatim:

> Las recomendaciones emitidas por este sistema son de carácter informativo y educativo. Los resultados se basan en el Marco Argumentativo Financiero (FAF) y no constituyen asesoría financiera personalizada.
>
> FAF - Marco Argumentativo Financiero - Desarrollado por Javier M. Debórtoli.

This footer MUST NOT be duplicated per-page (one shared instance, inherited from the shell). The old crypto-only footer copy ("Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67.") MUST be fully removed and MUST NOT appear anywhere in the DOM. The footer MUST NOT visually overlap any page content.

#### Scenario: Footer renders with exact copy on the crypto route
- GIVEN the user is on `/dashboard/crypto`
- WHEN the page renders
- THEN the footer MUST show the exact copy verbatim, including the disclaimer paragraph and the attribution line

#### Scenario: Footer renders with the same exact copy on a placeholder-market route
- GIVEN the user is on a placeholder-market route (e.g. `/dashboard/forex`)
- WHEN the page renders
- THEN the footer MUST show the exact same copy verbatim as on `/dashboard/crypto`, proving it is a single shared footer, not duplicated per-page

#### Scenario: Old footer copy is fully absent from the DOM
- GIVEN any `/dashboard/*` route renders, including `/dashboard/crypto`
- WHEN the DOM is inspected
- THEN the text "Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67." MUST NOT be present anywhere

#### Scenario: Footer does not overlap page content
- GIVEN `/dashboard/crypto` renders on a narrow viewport
- WHEN the bounding box of the footer and the bounding box of the last visible card or content element are compared
- THEN the two bounding boxes MUST NOT intersect

### Requirement: Per-market routing

The system MUST expose `/dashboard/crypto` as the only market route hosting the real decision dashboard. Every other market MUST have its own route (`/dashboard/{market-slug}`) that renders a shared placeholder page. Bare `/dashboard` MUST NOT 404 and MUST land the user on a working crypto view.

#### Scenario: Crypto route hosts the real dashboard
- GIVEN the user navigates to `/dashboard/crypto`
- WHEN the page loads
- THEN the existing Tier 1 card overview MUST render with live data, unchanged in behavior

#### Scenario: Non-crypto market route renders the placeholder
- GIVEN the user clicks "Acciones" in the sidebar
- WHEN the route `/dashboard/acciones` (or its assigned slug) loads
- THEN the shared placeholder page MUST render instead of any decision data

#### Scenario: Bare /dashboard never 404s
- GIVEN a user has the current `/dashboard` URL bookmarked
- WHEN they navigate to `/dashboard`
- THEN they MUST land on a working crypto view (via redirect or route-group index), never a 404

### Requirement: Placeholder-market page

The system MUST render a distinct placeholder page for every non-crypto market stating, in Spanish, that the market is not yet available (honest "próximamente" register). This page MUST NOT include any call-to-action, interest-capture form, or "notify me" affordance. It MUST reuse the `role="status"` / dashed-border visual convention established by `ServiceUnavailable`/`EmptyState`, but MUST use a `data-testid` distinct from both `service-unavailable` and `empty-state`.

#### Scenario: Placeholder shows honest unavailable copy, no CTA
- GIVEN the user is on `/dashboard/forex`
- WHEN the placeholder page renders
- THEN it MUST show Spanish copy indicating the market is not yet available
- AND it MUST NOT contain any link, button, or form for "notify me" or interest capture

#### Scenario: Placeholder is testably distinct from other empty/unavailable states
- GIVEN the placeholder page, `ServiceUnavailable`, and `EmptyState` all use `role="status"` and a dashed-border visual convention
- WHEN a test queries by `data-testid`
- THEN the placeholder's `data-testid` MUST differ from both `service-unavailable` and `empty-state`, so the three states remain independently testable

### Requirement: Mobile navigation drawer

On mobile viewports, the system MUST expose a hamburger control that opens a drawer overlay containing the same market links as the desktop sidebar. This MUST NOT regress the current mobile single-column dashboard.

#### Scenario: Drawer exposes the same links as desktop
- GIVEN a mobile viewport
- WHEN the user opens the drawer via the hamburger control
- THEN the drawer MUST list the same markets, in the same groups and order, as the desktop sidebar

#### Scenario: Mobile dashboard still usable without the drawer open
- GIVEN a mobile viewport with the drawer closed
- WHEN the user views `/dashboard/crypto`
- THEN the single-column card overview MUST render and function exactly as it does today

### Requirement: Sidebar accessibility baseline

The sidebar and drawer navigation MUST expose `aria-current="page"` on the active market's link, MUST be wrapped in a `<nav>` element with an `aria-label`, and MUST show a visible focus indicator when a link receives keyboard focus.

#### Scenario: aria-current marks the active market
- GIVEN the user is on `/dashboard/crypto`
- WHEN the sidebar renders
- THEN the Criptomonedas link MUST have `aria-current="page"`
- AND no other market link MUST have `aria-current` set

#### Scenario: Nav landmark and keyboard focus are present
- GIVEN the sidebar is rendered
- WHEN inspected for accessibility
- THEN it MUST be contained in a `<nav aria-label="...">` landmark
- AND tabbing to a market link MUST show a visible focus-visible outline

### Requirement: No new third-party CDN/font dependency

Sidebar and market icons MUST be self-contained inline SVG. The change MUST NOT introduce any new Google Fonts `<link>` tag or third-party CDN `<script>`/`<link>` beyond what `app/layout.tsx` already loads.

#### Scenario: No new external font/icon CDN reference
- GIVEN the rendered document `<head>`
- WHEN compared against `app/layout.tsx`'s current font loading
- THEN no new Google Fonts `<link>` or third-party CDN `<script>`/`<link>` tag MUST be present
