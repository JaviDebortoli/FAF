# Delta for decision-dashboard

## ADDED Requirements

### Requirement: Crypto view heading reflects market catalog label

The `/dashboard/crypto` view's `<h1>` MUST render the crypto market's catalog label (`MARKETS.crypto.label`, currently "Criptomonedas") instead of a hardcoded, decision-specific string. This MUST follow the same data-driven pattern `app/dashboard/[market]/page.tsx` already uses for every other market's `<h1>` (`{market.label}`), so the crypto view's heading source stays consistent with the rest of the market shell and cannot silently drift from the shared `MARKETS` catalog.

#### Scenario: Crypto h1 shows the catalog label

- GIVEN a user navigates to `/dashboard/crypto`
- WHEN the page renders
- THEN the `<h1>` MUST read "Criptomonedas"
- AND its value MUST come from `MARKETS.crypto.label`, not a separate hardcoded literal

#### Scenario: Heading updates if the catalog label changes

- GIVEN `MARKETS.crypto.label` is later changed in `lib/markets.ts`
- WHEN `/dashboard/crypto` renders
- THEN the `<h1>` MUST reflect the updated catalog value automatically, without a separate code edit to the crypto page's heading
