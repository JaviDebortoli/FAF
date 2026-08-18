# Delta for market-navigation

## MODIFIED Requirements

### Requirement: Sidebar navigation shell

The system MUST render a persistent sidebar `<nav>` displaying a branding header — title "Plataforma FAF" and subtitle "Recomendaciones financieras explicables en tiempo real" — as the first element, above the market groups, in both the desktop sidebar and the mobile drawer. Below the branding header, the sidebar MUST list exactly these markets, grouped into two labeled sections in this order: "MERCADOS PRINCIPALES" (Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs) and "MERCADO ARGENTINO" (CEDEARs, Dólar y Cotizaciones, Plazo Fijo y Locales). Grouping and order MUST match the mockup (`new_dashboard_example/code.html`) as-is (no roadmap-priority reordering). The link corresponding to the currently active market MUST be visually distinguished from inactive links.

(Previously: rendered only the grouped market links, with no branding header above them.)

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

## ADDED Requirements

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
