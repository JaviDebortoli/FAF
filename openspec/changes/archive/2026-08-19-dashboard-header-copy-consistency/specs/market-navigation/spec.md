# Delta for market-navigation

## ADDED Requirements

### Requirement: Dashboard eyebrow copy is consistent across market views

Every `/dashboard/*` view (crypto and every placeholder market) MUST render the eyebrow text "Panel de decisiones", without any "FAF · " prefix. The prefix is redundant with the app's existing branding chrome and MUST NOT be reintroduced on any market view.

#### Scenario: Crypto view eyebrow has no FAF prefix

- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page renders
- THEN the eyebrow text MUST read exactly "Panel de decisiones"

#### Scenario: Placeholder-market view eyebrow matches crypto

- GIVEN a user navigates to a placeholder-market route (e.g. `/dashboard/forex`)
- WHEN the page renders
- THEN the eyebrow text MUST read exactly "Panel de decisiones", identical to the crypto view's eyebrow

### Requirement: Determinism disclaimer appears on every market view

Every `/dashboard/*` view MUST render this exact disclaimer paragraph, verbatim and byte-for-byte identical across all views, regardless of whether the view currently shows recommendation cards:

> Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA.

This requirement applies uniformly to the crypto view and to every placeholder-market view; the wording MUST NOT be adapted or reworded per market.

#### Scenario: Crypto view shows the disclaimer

- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page renders
- THEN the disclaimer paragraph MUST be present, matching the exact copy above

#### Scenario: Placeholder-market view shows the identical disclaimer

- GIVEN a user navigates to a placeholder-market route (e.g. `/dashboard/forex`)
- WHEN the page renders
- THEN the disclaimer paragraph MUST be present
- AND its text MUST be byte-for-byte identical to the disclaimer shown on `/dashboard/crypto`
