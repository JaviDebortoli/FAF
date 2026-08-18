# Proposal: market-nav-redesign — multi-market navigation shell

## Intent

Today the dashboard is a single bare route (`/dashboard`) with no market concept — it works because only crypto has backend data. The mockup in `new_dashboard_example/` demonstrates a sidebar navigation shell listing ~11 markets (Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs, CEDEARs, Dólar/Cotizaciones, Plazo Fijo/Locales), signaling the platform's intended future scope beyond crypto. This change introduces that navigation shell now — architecturally correct and honest about what's real today — so future markets have a defined home without pretending they exist yet. Only Criptomonedas gets real functionality; every other item is a genuine, navigable "próximamente" state, not a decoration.

## Scope

### In Scope — locked decisions (user-confirmed, not open for re-litigation)

1. **Visual identity: Adapt, not Replace.** Keep IBM Plex Sans/Mono and the current 5-token `@theme` block (`--color-buy/sell/inactive/muted/threshold`). `DESIGN.md`'s Inter/JetBrains Mono + ~50-token MD3 palette is layout/nav reference only, never ported. `DecisionCard`, `ScoreGauge`, `Sparkline`, `RecommendationBadge`, `DirectionFilter` keep current styling; only new nav-shell elements (sidebar, market header) get new, minimal, style-consistent treatment.
2. **Non-functional menu items: clickable "próximamente" placeholder pages**, reusing `ServiceUnavailable.tsx`/`EmptyState.tsx` conventions (dashed border, `role="status"`, Spanish copy, honest "market not yet supported" register).
3. **Sidebar architecture: real Next.js routes per market** (`/dashboard/crypto` + `/dashboard/{market-slug}` per placeholder). Design must pick the exact slug scheme and resolve the bare `/dashboard` route (redirect vs. alias vs. index) — constraint: whatever is chosen must not silently break the current bookmarked `/dashboard` URL without a redirect.
4. **Gauge fidelity: keep the current dual-needle `ScoreGauge` exactly as-is** (both σ⁺ and σ⁻ real values), restyled only if the new layout requires it. The mockup's single-needle-plus-fixed-reference simplification is rejected — it would silently drop information the `decision-dashboard` spec's "gauge comparing σ(μ⁺) and σ(μ⁻) against θ" requirement demands.

### In Scope — resolved (orchestrator defaults, flag if wrong)

5. **Mobile nav**: hamburger/drawer overlay revealing the same sidebar content on mobile — standard, low-risk. Must not regress the current functional mobile single-column dashboard view.
6. **Tier 2 (drill-down/graph/narrative): unchanged behavior**, only re-mounted under the new page layout. `DrilldownPanel`/`ArgumentGraph`/`ThesisScores`/`NarrativePanel` need zero functional changes.
7. **Responsive breakpoints: keep current `sm:grid-cols-2 lg:grid-cols-3`** (not the mockup's `md:grid-cols-2`) — avoids regressing already-tuned card-grid behavior for a change whose payload is navigation.
8. **Filter wiring (locked requirement, not really a question)**: the existing, already-functional `DirectionFilter` (`role="group"`, `aria-pressed`, real `onClick`) ships — never the mockup's static unwired markup. New spec scenario confirms this explicitly.
9. **Accessibility baseline for the sidebar (non-negotiable quality bar)**: `aria-current="page"` on the active market link, a `<nav aria-label="...">` landmark, visible keyboard focus states — same rigor as `DirectionFilter`'s existing `role="group"`/`aria-pressed`.
10. **Icon dependency: no Google Material Symbols CDN.** Self-contained inline SVG icons for sidebar nav items — consistent with the app's current zero-third-party-CDN posture (IBM Plex is self-hosted via `next/font/google`).

### Out of Scope / Non-Goals

- No backend/data support for any non-crypto market: no new `src/market/` providers, no n8n workflow changes, no new API routes beyond what routing itself requires.
- No replacement of the app's established visual identity (see decision 1).
- No change to `Decision`/`DecisionReport`'s data model — confirmed by exploration that no `market` field is needed since only crypto has data today.
- No Tier 2 UX redesign — drill-down/graph/narrative behavior is explicitly frozen (default 6).

## Capabilities

### New Capabilities
- `market-navigation`: sidebar nav shell (grouped market links, active-state indication, mobile drawer), per-market routing (`/dashboard/{market-slug}`), and the "próximamente" placeholder-market page pattern, including accessibility baseline.

### Modified Capabilities
- `decision-dashboard`: Tier 1 overview now mounts under a market-scoped route instead of bare `/dashboard`; reaffirms (does not change) the dual-needle gauge, `sm/lg` grid breakpoints, and wired `DirectionFilter` as explicit requirements under the new shell; adds a scenario for `/dashboard` redirect/alias behavior.

## Approach

Wrap the existing dashboard in a layout-level sidebar shell backed by real Next.js routes. `/dashboard/crypto` hosts the current `OverviewClient` tree unmodified in behavior; `/dashboard/{other-market}` routes render a shared placeholder page component. The bare `/dashboard` route redirects to the canonical crypto route (exact mechanism — `redirect()` vs. route group index — is an `sdd-design` decision, constrained to never 404 or silently drop the existing bookmark). No changes below `GET /api/decisions` — the entire L1–L4 reasoning core and `src/market/*` are untouched.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(dashboard)/page.tsx` | Modified/Moved | Becomes redirect shim or route-group index to `/dashboard/crypto` |
| `app/(dashboard)/crypto/` (new segment) | New | Hosts current `OverviewClient` tree, unchanged behavior |
| `app/(dashboard)/{market}/` (new segments, ~10) | New | Shared "próximamente" placeholder page per market slug |
| `app/(dashboard)/components/Sidebar.tsx` (new) | New | Nav shell: grouped links, active state, mobile drawer, a11y baseline |
| `app/(dashboard)/components/MarketPlaceholder.tsx` (new) | New | Reuses `ServiceUnavailable`/`EmptyState` visual conventions |
| `app/(dashboard)/components/OverviewClient.tsx` | Unchanged (behavior) | Re-mounted under new layout only |
| `app/(dashboard)/components/DirectionFilter.tsx`, `DecisionCard.tsx`, `ScoreGauge.tsx`, `Sparkline.tsx`, `RecommendationBadge.tsx` | Unchanged (behavior) | No functional change; restyle only if nav-shell layout requires spacing tweaks |
| `app/(dashboard)/components/DrilldownPanel.tsx`, `ArgumentGraph.tsx`, `NarrativePanel.tsx`, `ThesisScores.tsx` | Unchanged | Must still work correctly mounted under the new shell |
| `app/globals.css` | Modified | New minimal tokens for nav-shell elements only; no token-set replacement |
| `openspec/specs/decision-dashboard/spec.md` | Modified | New route/redirect scenario; reaffirms gauge/filter/breakpoint requirements |
| `openspec/specs/market-navigation/spec.md` | New | Sidebar, routing, placeholder pages, a11y baseline |
| `tests/e2e/dashboard.spec.ts` | Modified | Update for new route path |
| `tests/e2e/market-nav.spec.ts` (new) | New | Sidebar routing, mobile drawer, placeholder pages, a11y |
| No changes | — | `src/rdf`, `src/stream`, `src/laf`, `src/decision`, `src/cycle`, `src/market`, `app/api/*`, `lib/{scores,select,gauge,sparkline,graphLayout}.ts` |

## Risks

| Risk | Status | Mitigation |
|------|--------|------------|
| Visual identity fork | Resolved | Adapt locked (decision 1) |
| Gauge information loss | Resolved | Dual-needle kept as-is (decision 4) |
| Routing scheme / `/dashboard` redirect undecided | Open | `sdd-design` must pick canonical URL + redirect mechanism; constraint: never break the existing bookmark |
| PR review budget (8+ files: routes, sidebar, placeholder page, spec, e2e) | Open | Recommend chained/stacked PRs, sliced precisely in `sdd-tasks`, same pattern as `dashboard-ux`/`dynamic-asset-count` |
| Mobile nav needs its own e2e coverage (no prior drawer pattern in this app) | Open | New `market-nav.spec.ts` scenario for drawer open/close + link navigation |
| Placeholder-market pages need explicit spec scenarios (mockup has zero non-happy-path states) | Open | New requirement in `market-navigation` spec: placeholder copy, `role="status"`, `data-testid` convention |
| Accessibility regressions on new sidebar markup | Low (mitigated) | `aria-current`, `<nav aria-label>`, focus-visible states locked as non-negotiable (default 9) |

## Rollback Plan

Revert the branch/PR(s). No schema, persistence, cache, or reasoning-core change is involved — `Decision`/`DecisionReport` and every route below `GET /api/decisions` are untouched. If routing causes issues post-merge, `/dashboard` can be restored as the sole route by reverting the redirect shim and route-group split; no data migration needed at any point.

## Dependencies

- None external. No new npm packages (icon approach uses inline SVG, not a font/CDN — default 10).

## Success Criteria

- [ ] Sidebar renders all ~11 markets with Criptomonedas active-styled and functional; the rest navigate to a real "próximamente" page.
- [ ] `/dashboard` redirects (or aliases) to the canonical crypto route without 404ing or losing the current bookmark.
- [ ] `ScoreGauge` still renders both σ⁺ and σ⁻ needles; `DirectionFilter` remains fully wired; card grid keeps `sm:`/`lg:` breakpoints.
- [ ] Mobile drawer opens/closes and exposes the same nav links as desktop.
- [ ] Sidebar meets the locked a11y baseline (`aria-current`, `<nav aria-label>`, visible focus states).
- [ ] No Google Material Symbols CDN or other new third-party font/icon dependency introduced.
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` all green (Strict TDD Mode).

## Proposal question round

Decisions 1–4 were already confirmed by the user; defaults 5–10 are orchestrator assumptions stated above for correction, not new blocking questions. Three product questions remain genuinely open and are non-blocking for `sdd-spec`/`sdd-design` to proceed, but worth an explicit answer:

1. Do the "próximamente" placeholder pages need any interest-capture affordance (e.g., a "notify me" link/email), or should they stay purely informational with no CTA?
2. Is there a real roadmap priority among the ~10 dormant markets (which one ships second), or is the current mockup grouping/order ("MERCADOS PRINCIPALES" / "MERCADO ARGENTINO") arbitrary and fine to keep as-is for now?
3. Is there a specific deadline or stakeholder review driving this now (e.g., thesis defense demo) that should influence how much polish the placeholder pages get in this first slice versus a later refinement?

If unanswered, this proposal proceeds with: no CTA on placeholders, mockup's existing grouping/order kept as-is, and standard effort/polish (no extra demo-specific polish pass).
