# Delta for market-navigation

## MODIFIED Requirements

### Requirement: Per-market routing

The system MUST expose one route per real market (`/dashboard/crypto` and `/dashboard/acciones`, matching `MARKETS.crypto.isReal` and `MARKETS.acciones.isReal` both being `true`) hosting that market's own real, market-scoped decision dashboard. Every remaining market MUST have its own route (`/dashboard/{market-slug}`) that renders a shared placeholder page. Bare `/dashboard` MUST NOT 404 and MUST land the user on the Inicio route (`/dashboard/inicio`). The root path `/` MUST also NOT 404 and MUST land the user on the same Inicio route.
(Previously: `/dashboard/crypto` was the ONLY market route hosting the real decision dashboard; `MARKETS.acciones.isReal` was `false` and `/dashboard/acciones` rendered the shared placeholder.)

#### Scenario: Crypto route hosts its real dashboard
- GIVEN the user navigates to `/dashboard/crypto`
- WHEN the page loads
- THEN the Tier 1 card overview MUST render with live crypto data, unchanged in behavior

#### Scenario: Acciones route hosts its own real dashboard
- GIVEN the user navigates to `/dashboard/acciones`
- WHEN the page loads
- THEN the Tier 1 card overview MUST render with live acciones data
- AND it MUST NOT render the shared placeholder page

#### Scenario: Remaining non-real markets still render the placeholder
- GIVEN the user clicks "Forex" in the sidebar
- WHEN the route `/dashboard/forex` loads
- THEN the shared placeholder page MUST render, unchanged by this proposal

#### Scenario: Bare /dashboard never 404s
- GIVEN a user has the current `/dashboard` URL bookmarked
- WHEN they navigate to `/dashboard`
- THEN they MUST land on `/dashboard/inicio`, never a 404

#### Scenario: Root path lands on Inicio, never a 404
- GIVEN a user navigates to `/`
- WHEN the root path resolves
- THEN they MUST land on `/dashboard/inicio`, never a 404
