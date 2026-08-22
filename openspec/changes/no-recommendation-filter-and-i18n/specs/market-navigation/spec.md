# Delta for market-navigation

## MODIFIED Requirements

### Requirement: DirectionFilter wiring unchanged by the navigation redesign

The Todos/Compra/Venta/Sin recomendación direction filter MUST keep its existing real wiring — `role="group"`, `aria-pressed` reflecting selection state, and a functional `onClick` handler that updates the visible cards — across all four states. The mockup's static, unwired filter markup MUST NOT replace it.
(Previously: covered only three states — ALL/BUY/SELL, with English labels — not the fourth Sin recomendación state.)

#### Scenario: Filter remains functional under the new shell
- GIVEN Compra, Venta, and Sin recomendación cards are all visible under `/dashboard/crypto`
- WHEN the user clicks the "Venta" filter option
- THEN only Venta cards MUST remain visible
- AND the Venta control MUST have `aria-pressed="true"` while the others have `aria-pressed="false"`

#### Scenario: Sin recomendación filter isolates muted cards
- GIVEN cards of all four states are visible
- WHEN the user clicks the "Sin recomendación" filter option
- THEN only NO_RECOMMENDATION (muted) cards MUST remain visible
- AND the Sin recomendación control MUST have `aria-pressed="true"` while the others have `aria-pressed="false"`

### Requirement: Determinism disclaimer appears on every market view

Every `/dashboard/*` view MUST render this exact disclaimer paragraph, verbatim and byte-for-byte identical across all views, regardless of whether the view currently shows recommendation cards:

> Cada tarjeta muestra una recomendación Compra/Venta/Sin recomendación derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA.

This requirement applies uniformly to the crypto view and to every placeholder-market view; the wording MUST NOT be adapted or reworded per market.
(Previously: pinned copy read "recomendación BUY/SELL" — the direction terms were untranslated English.)

#### Scenario: Crypto view shows the disclaimer

- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page renders
- THEN the disclaimer paragraph MUST be present, matching the exact copy above

#### Scenario: Placeholder-market view shows the identical disclaimer

- GIVEN a user navigates to a placeholder-market route (e.g. `/dashboard/forex`)
- WHEN the page renders
- THEN the disclaimer paragraph MUST be present
- AND its text MUST be byte-for-byte identical to the disclaimer shown on `/dashboard/crypto`
