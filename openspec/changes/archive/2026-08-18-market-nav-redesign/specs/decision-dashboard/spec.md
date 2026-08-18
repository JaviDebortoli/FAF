# Delta for decision-dashboard — Market Navigation Redesign

## ADDED Requirements

### Requirement: Crypto dashboard route under market navigation

The Tier 1 card overview MUST mount under the canonical crypto market route (`/dashboard/crypto`) instead of bare `/dashboard`. Bare `/dashboard` MUST redirect or alias to this canonical route so the existing bookmark keeps working.

#### Scenario: Overview mounts at the canonical crypto route
- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page loads
- THEN the Tier 1 card overview MUST render exactly as it does today at bare `/dashboard`

#### Scenario: Bare /dashboard redirects to the canonical route
- GIVEN a user has `/dashboard` bookmarked
- WHEN they navigate to `/dashboard`
- THEN they MUST end up viewing the same Tier 1 card overview, without a 404 and without needing to update the bookmark

### Requirement: Dual-needle gauge survives the navigation redesign

The `ScoreGauge` MUST continue to render both the σ⁺ needle and the σ⁻ needle, each positioned by its real computed value, unchanged by the introduction of the sidebar/market shell. The mockup's single-needle-plus-fixed-reference gauge MUST NOT be adopted.

#### Scenario: Both needles still render under the new shell
- GIVEN a BUY card for BTCUSDT rendered under `/dashboard/crypto`
- WHEN its gauge is inspected
- THEN both the σ⁺ needle and the σ⁻ needle MUST be present, each positioned from real computed values, not a fixed reference line

### Requirement: Card-grid breakpoints unchanged by the navigation redesign

The Tier 1 card grid MUST keep the `sm:grid-cols-2 lg:grid-cols-3` responsive breakpoints. The mockup's `md:grid-cols-2` breakpoint MUST NOT replace them.

#### Scenario: Grid still switches at sm/lg, not md
- GIVEN the Tier 1 overview rendered under the new sidebar shell
- WHEN the viewport is inspected across breakpoints
- THEN the card grid MUST switch to two columns at `sm` and three columns at `lg`, not at `md`

### Requirement: DirectionFilter wiring unchanged by the navigation redesign

The ALL/BUY/SELL direction filter MUST keep its existing real wiring — `role="group"`, `aria-pressed` reflecting selection state, and a functional `onClick` handler that updates the visible cards. The mockup's static, unwired filter markup MUST NOT replace it.

#### Scenario: Filter remains functional under the new shell
- GIVEN both BUY and SELL cards are visible under `/dashboard/crypto`
- WHEN the user clicks the SELL filter option
- THEN only SELL cards MUST remain visible
- AND the SELL control MUST have `aria-pressed="true"` while the others have `aria-pressed="false"`
