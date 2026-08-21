# Delta for market-navigation

## MODIFIED Requirements

### Requirement: Sidebar navigation shell

The system MUST render a persistent sidebar `<nav>` displaying a branding header — title "Plataforma FAF" and subtitle "Recomendaciones financieras explicables en tiempo real" — as the first element, above the market groups, in both the desktop sidebar and the mobile drawer. Immediately below the branding header, the sidebar MUST render an "Inicio" link (`/dashboard/inicio`), styled identically to a market link: same active/inactive className pattern, same icon+label layout, `data-testid="sidebar-link-inicio"`. Below the Inicio link, the sidebar MUST list exactly these markets, grouped into two labeled sections in this order: "MERCADOS PRINCIPALES" (Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs) and "MERCADO ARGENTINO" (CEDEARs, Dólar y Cotizaciones, Plazo Fijo y Locales). Grouping and order MUST match the mockup (`new_dashboard_example/code.html`) as-is (no roadmap-priority reordering). The link corresponding to the currently active market or Inicio MUST be visually distinguished from inactive links.
(Previously: the sidebar listed only the two market groups directly below the branding header, with no Inicio link.)

#### Scenario: Branding header renders above market groups, desktop and mobile
- GIVEN the dashboard shell renders
- WHEN the desktop sidebar mounts
- THEN it MUST show "Plataforma FAF" and "Recomendaciones financieras explicables en tiempo real" as the first element, above both market groups
- WHEN the mobile drawer opens
- THEN it MUST also show both texts as the first element, above the market groups

#### Scenario: Inicio link renders between branding and market groups
- GIVEN the dashboard shell renders
- WHEN the desktop sidebar or the mobile drawer mounts
- THEN an "Inicio" link with `data-testid="sidebar-link-inicio"` MUST render immediately below the branding header and above "MERCADOS PRINCIPALES"
- AND it MUST use the same active/inactive classes and icon+label layout as a market link

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

The system MUST render exactly one footer, shared across every `/dashboard/*` route except `/dashboard/inicio` (both `/dashboard/crypto` and every placeholder-market route), containing this exact copy verbatim:

> Las recomendaciones emitidas por este sistema son de carácter informativo y educativo. Los resultados se basan en el Marco Argumentativo Financiero (FAF) y no constituyen asesoría financiera personalizada.
>
> FAF - Marco Argumentativo Financiero - Desarrollado por Javier M. Debórtoli.

This footer MUST NOT be duplicated per-page (one shared instance, inherited from the shell, on every route where it applies). The old crypto-only footer copy ("Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67.") MUST be fully removed and MUST NOT appear anywhere in the DOM. The footer MUST NOT visually overlap any page content. The Inicio route (`/dashboard/inicio`) MUST NOT render the `dashboard-footer` element at all.
(Previously: the footer was shared across every `/dashboard/*` route with no exception.)

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

#### Scenario: Inicio route renders no footer
- GIVEN the user is on `/dashboard/inicio`
- WHEN the page renders
- THEN no `dashboard-footer` element MUST be present anywhere in the DOM

### Requirement: Per-market routing

The system MUST expose `/dashboard/crypto` as the only market route hosting the real decision dashboard. Every other market MUST have its own route (`/dashboard/{market-slug}`) that renders a shared placeholder page. Bare `/dashboard` MUST NOT 404 and MUST land the user on the Inicio route (`/dashboard/inicio`). The root path `/` MUST also NOT 404 and MUST land the user on the same Inicio route.
(Previously: bare `/dashboard` MUST NOT 404 and MUST land the user on a working crypto view; the root path `/` was not addressed by this requirement's wording.)

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
- THEN they MUST land on `/dashboard/inicio`, never a 404

#### Scenario: Root path lands on Inicio, never a 404
- GIVEN a user navigates to `/`
- WHEN the root path resolves
- THEN they MUST land on `/dashboard/inicio`, never a 404
