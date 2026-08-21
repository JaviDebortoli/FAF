# Proposal: inicio-home-section — dedicated Inicio landing page

## Intent

Today `/` and bare `/dashboard` both redirect straight into the Criptomonedas decision dashboard — there is no neutral landing surface that orients a first-time visitor to what FAF is (a deterministic, non-AI argumentative framework) before dropping them into live market data. This change introduces a dedicated "Inicio" (Home) section that becomes the platform's real default landing page, with a CTA into the one functional market (Criptomonedas).

## Scope

### In Scope — locked decisions (user-confirmed, not open for re-litigation)
1. **Inicio becomes the default landing page.** Both `/` and bare `/dashboard` redirect to `/dashboard/inicio` (was `/dashboard/crypto`).
2. **Sidebar placement.** "Inicio" link sits between the branding subtitle and "MERCADOS PRINCIPALES", styled identically to market links (same classes, active-state, icon+label layout as `MarketLinkGroups`).
3. **Content.** Placeholder-quality: welcome heading + brief deterministic/no-AI framing (σ/γ/ρ/θ=0.67) + CTA to `/dashboard/crypto`. Exploration section 10's draft copy is the starting point for design/apply.
4. **Footer exclusion.** The shared `dashboard-footer` MUST NOT render on Inicio; every other `/dashboard/*` route keeps it unchanged.

### Out of Scope / Non-Goals
- No backend/data-model changes; Inicio is not added to `MARKETS`/`MARKET_GROUPS`.
- No redesign of other market routes, Tier 1/2 dashboard behavior, or non-crypto placeholder pages.
- Final Inicio copy — draft only; wording refinement is a design/apply concern.

## Capabilities

### New Capabilities
- None (Inicio is new UI surface, not a new domain capability).

### Modified Capabilities
- `market-navigation`: "Per-market routing" (redirect target), "Sidebar navigation shell" (branding → Inicio → market-groups order), "Shared shell footer" (Inicio exception).
- `decision-dashboard`: "Crypto dashboard route under market navigation" (bare `/dashboard` now lands on Inicio, not the Tier 1 overview directly).

## Approach

Add `app/dashboard/inicio/page.tsx` as a static sibling of `crypto/page.tsx` (outside `[market]/page.tsx` since Inicio isn't in `MARKETS`). Retarget both redirect shims (`app/dashboard/page.tsx`, `app/(dashboard)/page.tsx`) to `/dashboard/inicio`. Extract an `InicioLink` sub-component in `Sidebar.tsx` mirroring `MarketLinkGroups`'s active-state pattern; add a hand-drawn `Home` icon to `icons.tsx`. Exclude the footer via route-group restructuring (exploration Option B): `app/dashboard/layout.tsx` keeps only `<Sidebar/>` + a plain content wrapper; a new `app/dashboard/(with-footer)/layout.tsx` carries `<footer>` + `pb-48`; `crypto/page.tsx` and `[market]/page.tsx` move under that group (URL-neutral); `inicio/page.tsx` stays outside it. This preserves "one shared footer instance, inherited from the shell" and keeps all layouts Server Components — rejected alternatives (client-side conditional render, per-page opt-in) are documented in exploration section 8.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/dashboard/inicio/page.tsx` | New | Static Inicio route |
| `app/dashboard/page.tsx`, `app/(dashboard)/page.tsx` | Modified | Redirect target → `/dashboard/inicio` |
| `app/dashboard/layout.tsx` | Modified | Footer/`pb-48` removed |
| `app/dashboard/(with-footer)/layout.tsx` | New | Footer + `pb-48`, wraps crypto/`[market]` |
| `app/dashboard/crypto/`, `app/dashboard/[market]/` | Moved | Under new `(with-footer)` route group, URL-neutral |
| `app/(dashboard)/components/Sidebar.tsx` | Modified | New `InicioLink` sub-component; `activeSlug` fallback `'crypto'` → `'inicio'` |
| `app/(dashboard)/components/icons.tsx` | Modified | New `Home` icon |
| `openspec/specs/market-navigation/spec.md` | Modified | 2 requirements (routing, footer) |
| `openspec/specs/decision-dashboard/spec.md` | Modified | 1 requirement (canonical route) |
| `tests/e2e/dashboard.spec.ts` | Modified | Rewrite bare-`/dashboard` test; add root-`/` test |
| `tests/e2e/market-nav.spec.ts` | Modified | Update group-order assertion; add Inicio `aria-current` + footer-absence tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Route-group restructuring touches 4 files instead of 1 | Med | Necessary to preserve Server Component chrome + shared-footer invariant; scoped in exploration Option B |
| "Sidebar navigation shell" spec delta under-scoped if only "Shared shell footer" is touched | Med | Flagged explicitly in exploration section 12; both requirements listed above |
| Bare-`/dashboard` e2e test needs non-trivial rewrite (post-redirect assertions currently depend on crypto card content) | Med | Cataloged in exploration section 9; move crypto-card assertions to a direct `/dashboard/crypto` visit |
| Root `/` has zero prior e2e coverage | Low | New test added as part of this change, not a regression |

## Rollback Plan

Revert the PR(s). No schema, persistence, or reasoning-core change — everything below `GET /api/decisions` is untouched. If the footer route-group split causes issues, `crypto/`/`[market]/` can move back under the plain `app/dashboard/layout.tsx` and the footer restored there; redirects can be reverted to `/dashboard/crypto` independently.

## Dependencies

- None external. Icon is hand-drawn inline SVG, matching the existing zero-CDN convention.

## Success Criteria

- [ ] `/` and bare `/dashboard` both land on `/dashboard/inicio`, never a 404.
- [ ] Sidebar shows Inicio between branding and "MERCADOS PRINCIPALES", visually identical to a market link, with correct `aria-current` on `/dashboard/inicio`.
- [ ] Inicio page renders welcome copy + CTA to `/dashboard/crypto`; no `dashboard-footer` element present.
- [ ] `/dashboard/crypto` and all placeholder market routes still render the shared footer, unchanged.
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` all green (Strict TDD Mode).

## Proposal question round

Scope was already confirmed by the user via an `AskUserQuestion` round (see binding scope 1–4 above) and exploration resolved every remaining design question with concrete recommendations. No new blocking questions remain. One open item worth flagging, non-blocking: the draft Inicio copy (exploration section 10) is a starting point, not final wording — `sdd-design`/`sdd-apply` should treat it as adjustable.
