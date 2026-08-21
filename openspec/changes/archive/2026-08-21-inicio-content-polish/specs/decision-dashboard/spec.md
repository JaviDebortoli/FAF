# Delta for decision-dashboard

## MODIFIED Requirements

### Requirement: Crypto dashboard route under market navigation

The Tier 1 card overview MUST mount under the canonical crypto market route (`/dashboard/crypto`), reachable directly or via the sidebar's Criptomonedas link. Bare `/dashboard` MUST land the user on the Inicio route (`/dashboard/inicio`) rather than directly on the Tier 1 overview, so the existing bookmark keeps working without a 404.
(Previously: reachable directly, via the Inicio route's CTA, or via the sidebar's Criptomonedas link — the Inicio route's CTA to `/dashboard/crypto` has been removed, so it is no longer a reachability path.)

#### Scenario: Overview mounts at the canonical crypto route
- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page loads
- THEN the Tier 1 card overview MUST render exactly as it does today at bare `/dashboard`

#### Scenario: Bare /dashboard lands on Inicio, not the overview directly
- GIVEN a user has `/dashboard` bookmarked
- WHEN they navigate to `/dashboard`
- THEN they MUST land on `/dashboard/inicio`, not directly on the Tier 1 card overview, and never a 404
- AND from there, navigating to `/dashboard/crypto` (via the sidebar link) MUST still show the same Tier 1 card overview, unchanged
