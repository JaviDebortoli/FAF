# Delta for market-navigation

## MODIFIED Requirements

### Requirement: Shared shell footer

The system MUST render exactly one footer, shared across every `/dashboard/*` route including `/dashboard/inicio` (`/dashboard/crypto`, every placeholder-market route, and `/dashboard/inicio`), containing this exact copy verbatim:

> Las recomendaciones emitidas por este sistema son de carácter informativo y educativo. Los resultados se basan en el Marco Argumentativo Financiero (FAF) y no constituyen asesoría financiera personalizada.
>
> FAF - Marco Argumentativo Financiero - Desarrollado por Javier M. Debórtoli.

This footer MUST NOT be duplicated per-page (one shared instance, inherited from the shell, on every route). The old crypto-only footer copy ("Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67.") MUST be fully removed and MUST NOT appear anywhere in the DOM. The footer MUST NOT visually overlap any page content.
(Previously: the footer was shared across every `/dashboard/*` route except `/dashboard/inicio` (both `/dashboard/crypto` and every placeholder-market route); the Inicio route (`/dashboard/inicio`) MUST NOT render the `dashboard-footer` element at all.)

#### Scenario: Footer renders with exact copy on the crypto route
- GIVEN the user is on `/dashboard/crypto`
- WHEN the page renders
- THEN the footer MUST show the exact copy verbatim, including the disclaimer paragraph and the attribution line

#### Scenario: Footer renders with the same exact copy on a placeholder-market route
- GIVEN the user is on a placeholder-market route (e.g. `/dashboard/forex`)
- WHEN the page renders
- THEN the footer MUST show the exact same copy verbatim as on `/dashboard/crypto`, proving it is a single shared footer, not duplicated per-page

#### Scenario: Footer renders with the same exact copy on the Inicio route
- GIVEN the user is on `/dashboard/inicio`
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
