# Proposal: Dashboard Header Copy Consistency

## Intent

Dashboard market views currently show inconsistent, redundant header copy: the eyebrow repeats "FAF · " (already implied by app chrome), crypto's `<h1>` ("Recomendaciones activas") doesn't follow the "show market name" pattern every other market view already uses, and the "not AI-generated" determinism disclaimer only appears on the crypto view — not on the other market views where users may equally need that assurance. This change aligns header copy across all `/dashboard/*` views per explicit user request.

## Scope

### In Scope
- Drop the "FAF · " eyebrow prefix in `app/dashboard/crypto/page.tsx` and `app/dashboard/[market]/page.tsx` → "Panel de decisiones".
- Crypto `<h1>`: "Recomendaciones activas" → data-driven "Criptomonedas" (`MARKETS.crypto.label`), matching how `[market]/page.tsx` already renders `{market.label}`.
- Add the disclaimer paragraph ("Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA.") verbatim to `[market]/page.tsx`, so every market view shows it like crypto does today.
- Update `tests/e2e/market-nav.spec.ts:246,348` assertions from "Recomendaciones activas" to "Criptomonedas".

### Out of Scope
- Any other dashboard chrome/copy (sidebar, footer, nav labels).
- New markets beyond the existing `MARKETS` catalog.
- Whether the disclaimer wording itself should differ for real vs. placeholder markets (see open question below) — first slice ships literal copy per the binding request; wording nuance is deferred.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None — neither `market-navigation` nor `decision-dashboard` specs pin this copy as a requirement (confirmed clean gap during exploration). `sdd-spec` may choose to codify these strings as new requirements.

## Approach

Direct text edits in the two page files; crypto's `<h1>` switches from a hardcoded literal to `MARKETS.crypto.label` to prevent future drift. `sdd-design` decides whether to extract a shared `DashboardHeader` component (`title`/`showDisclaimer` props) or keep the two-file duplication — exploration flags this as a recommendation, not a mandate.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/dashboard/crypto/page.tsx` | Modified | Drop "FAF · " eyebrow; h1 → `MARKETS.crypto.label` |
| `app/dashboard/[market]/page.tsx` | Modified | Drop "FAF · " eyebrow; add disclaimer `<p>` |
| `tests/e2e/market-nav.spec.ts` | Modified | Update 2 assertions (lines 246, 348) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Disclaimer implies real BUY/SELL cards exist on placeholder market views, which today render `MarketPlaceholder` with no cards | Medium | Flagged in Proposal question round below; default is literal copy per binding request |
| e2e assertions break if not updated in the same change | Low | Listed explicitly in scope |
| Shared-component refactor (if design chooses it) touches both files at once | Low | Keep prop surface minimal (`title`/`showDisclaimer`) |

## Rollback Plan

Revert the copy edits in both page files and the two e2e assertion lines. No data, schema, or migration involved — a single commit revert is sufficient.

## Dependencies

None.

## Success Criteria

- [ ] All `/dashboard/*` views show "Panel de decisiones" (no "FAF · " prefix).
- [ ] `/dashboard/crypto` h1 reads "Criptomonedas".
- [ ] Every market view (crypto + all placeholder markets) shows the determinism disclaimer.
- [ ] `tests/e2e/market-nav.spec.ts` passes with updated assertions.

## Proposal question round

1. The disclaimer describes BUY/SELL cards "derivada de forma determinística por el framework argumentativo," but placeholder market views (everything except crypto) currently render `MarketPlaceholder` with no real recommendation cards yet. Should the disclaimer appear there verbatim as requested, or would a wording adjustment be preferable for placeholder markets specifically? **Assumption used**: verbatim, on every view, per the binding "igual que en Criptomonedas" instruction — please confirm or correct.
2. Should `sdd-design` decide now on extracting a shared `DashboardHeader` component, or is inline duplication acceptable for this pass? **Assumption used**: deferred to `sdd-design`; exploration's recommendation stands as a hint, not a mandate.
