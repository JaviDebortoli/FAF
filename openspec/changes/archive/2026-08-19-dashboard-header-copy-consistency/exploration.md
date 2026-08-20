# Exploration: dashboard-header-copy-consistency

## Current State

Two files under `app/dashboard/` each render a near-duplicate `<header>` block with the copy the user wants changed:

- `app/dashboard/crypto/page.tsx` (lines 29-44) — eyebrow `"FAF · Panel de decisiones"`, `<h1>Recomendaciones activas</h1>`, and the disclaimer `<p>` ("Cada tarjeta muestra... Esta vista no contiene texto generado por IA.").
- `app/dashboard/[market]/page.tsx` (lines 29-38) — same eyebrow, `<h1>{market.label}</h1>`, **no** disclaimer paragraph.

Confirmed `lib/markets.ts`'s `MARKETS['crypto']` (`app/(dashboard)/lib/markets.ts:34`) is already `{ slug: 'crypto', label: 'Criptomonedas', icon: 'Coins', isReal: true }` — so `crypto/page.tsx`'s h1 can read `MARKETS.crypto.label` instead of a new hardcoded literal, mirroring `[market]/page.tsx`'s existing `{market.label}` pattern. No shared `DashboardHeader`-type component exists today; `MarketPlaceholder.tsx` is the repo's only precedent for extracting shared `/dashboard/*` chrome.

## Affected Areas

- `app/dashboard/crypto/page.tsx` — eyebrow drop "FAF · "; h1 → data-driven "Criptomonedas".
- `app/dashboard/[market]/page.tsx` — eyebrow drop "FAF · "; ADD the disclaimer `<p>` verbatim.
- `tests/e2e/market-nav.spec.ts:246` and `:348` — both assert `toContainText('Recomendaciones activas')` on `/dashboard/crypto`; both must change to assert "Criptomonedas".
- `tests/e2e/dashboard.spec.ts` — checked, zero references to this header copy (its "disclaimer" tests are the unrelated Tier 2 "Generado por IA" narrative disclaimer).
- No unit tests touch this copy.

## Shared-component question

1. **Extract shared `DashboardHeader.tsx`** (`title`/`showDisclaimer` props, same pattern as `MarketPlaceholder.tsx`) — Pros: closes the exact drift risk that caused this bug (eyebrow was already duplicated identically, disclaimer silently diverged); matches the project's own DRY precedent (`dashboard-shell-branding`'s shared footer). Cons: one new file + two import edits for ~6 lines. Effort: Low.
2. **Keep small duplication inline** — Pros: zero new files. Cons: reintroduces the exact drift risk this change fixes.

**Recommendation**: Option 1 (shared `DashboardHeader` component), flagged as a design-level decision for `sdd-design` to finalize — not mandated here.

## Spec-conflict check

Read both `openspec/specs/market-navigation/spec.md` and `openspec/specs/decision-dashboard/spec.md` in full: neither pins the eyebrow text, the crypto h1, or the disclaimer paragraph as a requirement. No requirement needs to be superseded — clean gap.

## Test-impact catalog

- `tests/e2e/market-nav.spec.ts:246` — `toContainText('Recomendaciones activas')` → must become `'Criptomonedas'`.
- `tests/e2e/market-nav.spec.ts:348` — same, mobile-viewport variant → must become `'Criptomonedas'`.
- No other test files affected.

## Risks

- Both `market-nav.spec.ts` assertions break until updated in the same change — must land in tasks/apply together with the code change, not deferred.
- Disclaimer text must be copied byte-for-byte into `[market]/page.tsx` (or the shared component) per the user's explicit "igual que en Criptomonedas" instruction — exact source string confirmed above.
- If the shared component is adopted, keep its prop contract minimal (`title`/`showDisclaimer` only) to avoid scope creep.

## Ready for Proposal

Yes. Tiny, well-scoped, no spec conflicts, exact source/target strings and test lines identified.
