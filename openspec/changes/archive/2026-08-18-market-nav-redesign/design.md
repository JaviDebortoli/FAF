# Design: Multi-Market Navigation Shell

## Technical Approach

Wrap the existing single-route dashboard in a shared `app/(dashboard)/layout.tsx` that renders a client-side `Sidebar`. Real Next.js routes replace the bare `/dashboard` content: `/dashboard/crypto` (static segment) hosts the current `OverviewClient` tree byte-for-byte unchanged; `/dashboard/[market]` (one dynamic segment) renders a shared `MarketPlaceholder` for the ~9 non-crypto markets, looked up against a single `lib/markets.ts` config that also drives the sidebar list. Bare `/dashboard/page.tsx` becomes a `redirect('/dashboard/crypto')`. Zero new `@theme` tokens — the sidebar/placeholder reuse the existing 5-token palette plus raw `zinc-*` utilities, exactly like `EmptyState`/`ServiceUnavailable` already do. Satisfies every scenario in `specs/market-navigation/spec.md` and `specs/decision-dashboard/spec.md`.

## Architecture Decisions

### Decision: Bare `/dashboard` resolves via `redirect()`, not route-group index or alias

**Choice**: `app/(dashboard)/page.tsx` becomes a Server Component that calls `redirect('/dashboard/crypto')` (temporary, 307). All real content lives once, at `/dashboard/crypto`.
**Alternatives considered**: (a) Make `/dashboard` itself the crypto content and `/dashboard/crypto` a secondary alias — rejected: duplicates the content-rendering code path at two URLs, and breaks the sidebar's pathname-based active-link check (visiting bare `/dashboard` would never highlight "Criptomonedas" without special-casing). (b) Route-group index that inlines the same JSX as `/dashboard/crypto/page.tsx` — rejected: duplicates markup, drifts over time, same active-link ambiguity as (a).
**Rationale**: `redirect()` is the standard Next.js App Router pattern for "canonicalize an old URL"; it keeps exactly one source of truth for crypto content, guarantees the bookmark never 404s (spec: "Bare /dashboard MUST NOT 404"), and keeps every route's pathname unambiguous for active-link logic. Temporary (not `permanentRedirect`) because more markets may get real routes later and the canonical target could change.

### Decision: One dynamic segment `[market]/page.tsx` for all placeholder markets, not 9 static folders

**Choice**: `app/(dashboard)/[market]/page.tsx` looks up `params.market` in `MARKETS`; unknown slugs call `notFound()`. Next.js resolves the static `crypto/` segment before the dynamic `[market]` segment at the same level, so `/dashboard/crypto` never reaches this route.
**Alternatives considered**: 9 individual static folders (`acciones/page.tsx`, `renta-fija/page.tsx`, ...) each rendering the same `<MarketPlaceholder>` — rejected: pure boilerplate duplication, harder to add a future market (2 file edits instead of 1 config entry), no functional benefit since content is identical across all of them.
**Rationale**: DRY, single source of truth for "which slugs exist" (`lib/markets.ts`), still produces real, distinct, bookmarkable routes per market as the spec requires — a dynamic segment is still a real route per Next.js semantics, not client-side state.

### Decision: `Sidebar` is a single client component, not a server shell + client toggle split

**Choice**: `Sidebar.tsx` is entirely `'use client'`. It owns both the desktop `<nav>` list and the mobile hamburger/drawer state, using `usePathname()` for `aria-current` on every link.
**Alternatives considered**: Server `Sidebar` wrapping a client `MobileDrawerToggle` (the split suggested as a starting hypothesis) — rejected on investigation: App Router layouts/Server Components have no built-in way to read the current pathname (no `usePathname` equivalent server-side without a middleware header shim), and `aria-current` is required on *every* desktop link, not just inside the mobile drawer. Splitting would only move the mobile toggle to a client leaf while still forcing the link list itself to be client anyway (it needs `pathname`) — so the split buys no server-only surface, only extra file indirection.
**Rationale**: One client boundary matches the app's existing pattern (`OverviewClient` is the sole client island for Tier 1); avoids introducing middleware just to thread a pathname header through Server Components for a small, mostly-static nav list.

### Decision: Zero new `@theme` tokens

**Choice**: Sidebar/drawer/placeholder use raw `zinc-*` utilities (`bg-zinc-950`, `border-zinc-800`, `text-zinc-400`) for structure — identical to `EmptyState`/`ServiceUnavailable` today — and reuse the existing `--color-buy` token for the active-market accent (green = "this market is live", which is semantically apt, not just visually convenient).
**Alternatives considered**: New `--color-sidebar-bg` / `--color-sidebar-border` tokens mirroring the mockup's `surface-container-lowest`/`border-subtle` — rejected: the current 5 tokens are deliberately BUY/SELL/threshold semantic colors only; surfaces have never been tokenized in this codebase (cards already use raw `zinc-950`/`zinc-800`), so tokenizing only for the sidebar would be an inconsistent, one-off exception rather than "minimal, consistent with existing 5-token style."
**Rationale**: No new token clears a real need; reuse keeps the diff smaller and the token block's minimalism intact.

### Decision: Grouping/order follows the mockup HTML and `proposal.md`, flagging a spec.md wording discrepancy

**Choice**: Sidebar groups are "MERCADOS PRINCIPALES" (Acciones, Criptomonedas, Renta Fija, Forex, Commodities, Índices, ETFs — 7 items) and "MERCADO ARGENTINO" (CEDEARs, Dólar y Cotizaciones, Plazo Fijo y Locales — 3 items), matching `new_dashboard_example/code.html` lines 136–184 and `proposal.md`'s explicit list.
**Alternatives considered**: Following `specs/market-navigation/spec.md`'s literal wording, which writes "...Índices, ETFs / CEDEARs" inside the "MERCADOS PRINCIPALES" parenthetical and omits CEDEARs from its "MERCADO ARGENTINO" list of 2 items — rejected as the design source of truth.
**Rationale**: This reads as a transcription artifact in spec.md (slash-joining two items, and losing CEDEARs from the second group), not an intentional regrouping — it contradicts both the actual mockup markup (the named grouping/order reference per this task) and `proposal.md`'s own explicit 10-item list, and no proposal decision authorizes moving CEDEARs out of "MERCADO ARGENTINO." Flagged in Open Questions for spec.md correction; not fixed here since spec.md is a frozen upstream artifact for this phase.

## Route Structure

```
app/(dashboard)/
├── layout.tsx                   NEW   — <Sidebar/> + content slot, md:pl-64 offset
├── page.tsx                     MODIFY — redirect('/dashboard/crypto')
├── crypto/
│   └── page.tsx                 NEW   — moved verbatim from current page.tsx (header/OverviewClient/footer)
├── [market]/
│   └── page.tsx                 NEW   — MARKETS lookup → <MarketPlaceholder/>, notFound() if unknown slug
├── lib/
│   └── markets.ts               NEW   — MARKETS record + MARKET_GROUPS order (slug/label/icon)
└── components/
    ├── Sidebar.tsx               NEW  — client; desktop nav + mobile hamburger/drawer, aria-current
    ├── MarketPlaceholder.tsx     NEW  — server; "próximamente" copy, role="status"
    ├── icons.tsx                 NEW  — inline SVG icon components (server, pure)
    ├── OverviewClient.tsx / DirectionFilter.tsx / DecisionCard.tsx / ScoreGauge.tsx /
    │   Sparkline.tsx / RecommendationBadge.tsx / DrilldownPanel.tsx / ArgumentGraph.tsx /
    │   NarrativePanel.tsx / ThesisScores.tsx / EmptyState.tsx / ServiceUnavailable.tsx   UNCHANGED (re-mounted only)
```

**Slug scheme** (`lib/markets.ts`):

| Label | Group | Slug |
|---|---|---|
| Acciones | Principales | `acciones` |
| Criptomonedas | Principales | `crypto` |
| Renta Fija | Principales | `renta-fija` |
| Forex | Principales | `forex` |
| Commodities | Principales | `commodities` |
| Índices | Principales | `indices` |
| ETFs | Principales | `etfs` |
| CEDEARs | Argentino | `cedears` |
| Dólar y Cotizaciones | Argentino | `dolar` |
| Plazo Fijo y Locales | Argentino | `plazo-fijo` |

## Data Flow

    /dashboard  ──redirect()──▶  /dashboard/crypto ──▶ layout.tsx ──▶ Sidebar (client, usePathname)
                                        │                                   │
                                        ▼                                   ▼
                                 crypto/page.tsx                    MARKETS/MARKET_GROUPS
                                        │                            (shared lookup table)
                                        ▼                                   │
                                 OverviewClient (unchanged)                 │
                                                                            │
    /dashboard/{slug} ──▶ [market]/page.tsx ──MARKETS[slug]?──▶ MarketPlaceholder
                                        │ (unknown slug)
                                        ▼
                                    notFound()

## Component Contracts

```tsx
// lib/markets.ts
export interface Market { slug: string; label: string; icon: keyof typeof Icons; }
export const MARKETS: Record<string, Market> = { acciones: {...}, crypto: {...}, ... };
export const MARKET_GROUPS: { label: string; slugs: string[] }[] = [
  { label: 'MERCADOS PRINCIPALES', slugs: ['acciones','crypto','renta-fija','forex','commodities','indices','etfs'] },
  { label: 'MERCADO ARGENTINO', slugs: ['cedears','dolar','plazo-fijo'] },
];

// components/Sidebar.tsx — 'use client'
export function Sidebar() { /* usePathname() → activeSlug = pathname.split('/')[2] ?? 'crypto';
  useState mobileOpen; renders hamburger button (md:hidden) + overlay + <nav aria-label="Mercados">
  with <Link href={`/dashboard/${slug}`} aria-current={active ? 'page' : undefined}
  data-testid={`sidebar-link-${slug}`} className="...active: border-r-2 border-buy bg-buy/10 text-buy
  font-semibold ...inactive: text-zinc-400 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2
  focus-visible:outline-zinc-100" /> per group, from MARKET_GROUPS */ }

// components/MarketPlaceholder.tsx — server, pure
interface MarketPlaceholderProps { marketLabel: string; }
export function MarketPlaceholder({ marketLabel }: MarketPlaceholderProps) {
  return (
    <div data-testid="market-placeholder" role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 px-6 py-16 text-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">PRÓXIMAMENTE</span>
      <p className="max-w-sm text-sm text-zinc-400">{marketLabel} todavía no está disponible en la plataforma.</p>
    </div>
  );
}

// app/(dashboard)/[market]/page.tsx
export default function MarketPage({ params }: { params: { market: string } }) {
  const market = MARKETS[params.market];
  if (!market) notFound();
  return <MarketPlaceholder marketLabel={market.label} />;
}

// app/(dashboard)/page.tsx
export default function DashboardIndexPage() { redirect('/dashboard/crypto'); }

// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen"><Sidebar /><div className="flex-1 md:pl-64">{children}</div></div>;
}
```

`data-testid="market-placeholder"` is distinct from `empty-state`/`service-unavailable` per spec requirement.

## Icons (`components/icons.tsx`)

All 24×24 viewBox, `fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"`, hand-sourced once (no package/CDN import): `TrendingUp` (acciones), `Coins` (crypto — two overlapping circles), `Bank` (renta-fija — columns + roof polyline), `Swap` (forex — two opposing arrows), `Box` (commodities), `BarChart` (indices — ascending rects), `PieChart` (etfs — circle + arc path), `Receipt` (cedears — rect + 3 lines), `DollarSign` (dolar), `Lock` (plazo-fijo), `Menu` (hamburger — 3 lines), `Close` (X — 2 crossed lines).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E (new) `tests/e2e/market-nav.spec.ts` | Sidebar lists both groups in exact order; `aria-current="page"` on Criptomonedas at `/dashboard/crypto` and absent elsewhere; clicking "Acciones" navigates to `/dashboard/acciones` and shows `market-placeholder` with no CTA; bare `/dashboard` lands on crypto content, never 404; mobile viewport hamburger opens drawer with same links, closes on link click/overlay click; keyboard-tab focus shows visible outline | Playwright, stub `GET /api/decisions` as `dashboard.spec.ts` does |
| E2E (modify) `tests/e2e/dashboard.spec.ts` | Update route assertions from `/dashboard` to `/dashboard/crypto`; gauge dual-needle, `sm:`/`lg:` grid, `DirectionFilter` wiring assertions unchanged | Playwright, same stubbing pattern |
| Unit (optional, small) `tests/unit/markets.test.ts` | `MARKET_GROUPS` slugs all exist in `MARKETS`, no duplicate slugs, `crypto` present | Vitest — only if `sdd-tasks` judges the static config worth a RED test; no other new business logic exists |

No new Vitest surface beyond the optional config-shape test — this change is routing/presentation only.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/(dashboard)/layout.tsx` | Create | Sidebar + content shell |
| `app/(dashboard)/page.tsx` | Modify | `redirect('/dashboard/crypto')` |
| `app/(dashboard)/crypto/page.tsx` | Create | Moved verbatim from current `page.tsx` |
| `app/(dashboard)/[market]/page.tsx` | Create | Placeholder route, `notFound()` on unknown slug |
| `app/(dashboard)/lib/markets.ts` | Create | `MARKETS`/`MARKET_GROUPS` config |
| `app/(dashboard)/components/Sidebar.tsx` | Create | Client nav shell, desktop + mobile drawer |
| `app/(dashboard)/components/MarketPlaceholder.tsx` | Create | "Próximamente" page |
| `app/(dashboard)/components/icons.tsx` | Create | 12 inline SVG icon components |
| `tests/e2e/market-nav.spec.ts` | Create | Sidebar/routing/drawer/a11y coverage |
| `tests/e2e/dashboard.spec.ts` | Modify | Route path updated to `/dashboard/crypto` |
| `tests/unit/markets.test.ts` | Create (optional) | Config-shape check |
| `openspec/changes/market-nav-redesign/specs/market-navigation/spec.md` | Flag only | Grouping wording discrepancy noted, no edit in this phase |

No changes: `app/globals.css` (no new tokens), `app/layout.tsx`, `ScoreGauge.tsx`/`lib/gauge.ts`, `DirectionFilter.tsx`, `EmptyState.tsx`, `ServiceUnavailable.tsx`, Tier 2 components, anything under `src/` or `app/api/`.

## Threat Matrix

This change is Next.js App Router file-based UI routing and a client-side hamburger/drawer — no shell command, subprocess, VCS/PR automation, or executable-file classification boundary exists.

| Boundary | Applicability | Reason |
|---|---|---|
| Documentation-like paths | N/A | No file-type/executable classification involved |
| Git repository selection | N/A | No git/VCS invocation in this change |
| Commit state | N/A | No commit automation |
| Push state | N/A | No push automation |
| PR commands | N/A | No PR automation |

## Migration / Rollout

No data migration — `Decision`/`DecisionReport` and everything below `GET /api/decisions` are untouched. Rollout is a single merge; rollback is a plain revert (no schema/cache/persistence involved). Explicit success criterion carried from `proposal.md`: bare `/dashboard` MUST continue to work for existing bookmarks (via `redirect()` to `/dashboard/crypto`) — verified by the new e2e "bare /dashboard never 404s" scenario.

## Open Questions

- [ ] `specs/market-navigation/spec.md`'s "MERCADOS PRINCIPALES (..., ETFs / CEDEARs)" wording and its 2-item "MERCADO ARGENTINO" list appear to be a transcription artifact vs. `proposal.md` and the mockup HTML (which both place CEDEARs under "MERCADO ARGENTINO" as a 3rd item). This design follows the mockup/proposal (ground truth per the locked "keep grouping as-is" decision). Recommend a spec.md correction pass before/alongside `sdd-tasks`.
