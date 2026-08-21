# Design: Inicio Home Section

## Technical Approach

Add a new static route `app/dashboard/inicio/page.tsx` as a Server Component sibling of `crypto/page.tsx` (not routed through `[market]/page.tsx`, since Inicio is intentionally absent from `MARKETS`). Retarget both redirect shims to `/dashboard/inicio`. Extract a new `InicioLink` sidebar sub-component reusing `MarketLinkGroups`'s exact active-state class pattern, plus a new hand-drawn `Home` icon. Exclude the shared footer from Inicio via a Next.js route group (`app/dashboard/(with-footer)/`) so `app/dashboard/layout.tsx` stays a Server Component with zero client-side conditional logic — this maps directly to exploration Option B, ratified here without changes.

## Architecture Decisions

| Decision | Choice | Rejected alternatives | Rationale |
|---|---|---|---|
| Route placement | `app/dashboard/inicio/page.tsx`, static sibling of `crypto/` | Route through `[market]/page.tsx` with a synthetic `inicio` market entry | Inicio needs real content/layout, not the shared placeholder; adding it to `MARKETS` would pollute market-only data (sidebar groups, `MarketPlaceholder`) with a non-market concept |
| Footer exclusion mechanism | Route-group split (`(with-footer)` wraps `crypto/` + `[market]/`; `inicio/` stays outside) | (A) `'use client'` + `usePathname()` conditional in `layout.tsx`; (C) per-page `<DashboardFooter/>` opt-in | (A) regresses the codebase's server-rendered static-chrome convention for every route, not just Inicio. (C) contradicts spec's literal "one shared instance, inherited from the shell, MUST NOT be duplicated per-page" and loses the "impossible to forget on a new market route" guarantee. Route groups keep both invariants and add zero client-side branching |
| Inicio heading treatment | New page-local heading, not `DashboardHeader` | Reuse `DashboardHeader` with `showDisclaimer` | `DashboardHeader` is purpose-built for market views ("Panel de decisiones" eyebrow + market-label `<h1>`); forcing Inicio through it would misrepresent it as a market panel. A landing page needs its own heading semantics |
| Sidebar link extraction | New `InicioLink` function alongside `MarketLinkGroups` | Inline duplicate `<Link>` JSX in both nav surfaces | Mirrors the file's own precedent: `MarketLinkGroups` was extracted specifically because active-state link logic shouldn't be duplicated; Inicio's link has the same active-state logic |

## Data Flow

    /  or  /dashboard  ──redirect()──→  /dashboard/inicio  (Server Component, static)
                                              │
                                    <InicioLink> in Sidebar
                                    (activeSlug === 'inicio')
                                              │
                                    CTA <Link href="/dashboard/crypto">
                                              ▼
    /dashboard/crypto (and /dashboard/[market])  ──inside (with-footer) route group──→  <footer>

`usePathname()` in `Sidebar.tsx` drives `activeSlug` for both `InicioLink` and `MarketLinkGroups` — no new state, same client component.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/dashboard/inicio/page.tsx` | Create | New Server Component route; heading + copy + CTA |
| `app/dashboard/page.tsx` | Modify | `redirect('/dashboard/crypto')` → `redirect('/dashboard/inicio')` |
| `app/(dashboard)/page.tsx` | Modify | Same redirect retarget |
| `app/dashboard/layout.tsx` | Modify | Remove `<footer>` and `pb-48` |
| `app/dashboard/(with-footer)/layout.tsx` | Create | Carries `pb-48` wrapper + `<footer>`, moved verbatim |
| `app/dashboard/crypto/page.tsx` | Move | → `app/dashboard/(with-footer)/crypto/page.tsx`, content unchanged |
| `app/dashboard/[market]/page.tsx` | Move | → `app/dashboard/(with-footer)/[market]/page.tsx`, content unchanged |
| `app/(dashboard)/components/Sidebar.tsx` | Modify | New `InicioLink`; `activeSlug` fallback `'crypto'` → `'inicio'` |
| `app/(dashboard)/components/icons.tsx` | Modify | New `Home` function + `Icons.Home` |
| `tests/dashboard/crypto/page.test.ts` | Modify | Import path `@/app/dashboard/crypto/page` → `@/app/dashboard/(with-footer)/crypto/page` (see note below) |
| `openspec/specs/market-navigation/spec.md` | Modify (sdd-spec) | 2 requirements — not this phase's output |
| `openspec/specs/decision-dashboard/spec.md` | Modify (sdd-spec) | 1 requirement — not this phase's output |

### `app/dashboard/layout.tsx` (new full content)

```tsx
import { Sidebar } from '@/app/(dashboard)/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:pl-64">{children}</div>
    </div>
  );
}
```

### `app/dashboard/(with-footer)/layout.tsx` (new file, full content)

```tsx
export default function WithFooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-48">{children}</div>
      <footer
        data-testid="dashboard-footer"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950 py-4 md:left-64"
      >
        <div className="mx-auto max-w-6xl px-6 text-center font-mono text-xs leading-relaxed text-muted">
          <p>
            Las recomendaciones emitidas por este sistema son de carácter informativo y educativo. Los resultados
            se basan en el Marco Argumentativo Financiero (FAF) y no constituyen asesoría financiera personalizada.
          </p>
          <p className="mt-2 font-bold text-zinc-50">
            FAF - Marco Argumentativo Financiero - Desarrollado por Javier M. Debórtoli.
          </p>
        </div>
      </footer>
    </>
  );
}
```

Copy, className, and `data-testid="dashboard-footer"` are moved verbatim — existing footer-copy e2e assertions on `/dashboard/crypto` and placeholder routes keep passing unmodified. `pb-48` moves from `app/dashboard/layout.tsx`'s content wrapper into this layout's own wrapper `<div>` since its only purpose (reserving space above the now-conditional fixed footer) is scoped to routes that render the footer.

**Route-group nesting confirmed non-breaking**: `app/dashboard/layout.tsx` wraps `{children}` in `flex-1 md:pl-64`; `app/dashboard/(with-footer)/layout.tsx` nests one level inside and wraps its own `{children}` in `pb-48`. Both wrapper `<div>`s compose (outer controls sidebar offset, inner controls footer clearance) — no conflicting className, no duplicate landmark.

### Import-path note (unit test)

`tests/dashboard/crypto/page.test.ts` imports the page via the `@/` alias as a literal filesystem path (`@/app/dashboard/crypto/page`), not a URL. Route groups affect only the URL, not the on-disk path — after the move, the file physically lives at `app/dashboard/(with-footer)/crypto/page.tsx`, so this import must become `@/app/dashboard/(with-footer)/crypto/page`. Flagged explicitly here so `sdd-tasks` doesn't miss it: this is the one import-path break in the whole change, and it is NOT the `@/app/(dashboard)/...` alias (a pre-existing, different route group used by `Sidebar.tsx`, `DashboardHeader.tsx`, `lib/markets.ts` — untouched, since none of those files move).

**Static-over-dynamic precedence confirmed unaffected**: Next.js resolves `crypto` (static) ahead of `[market]` (dynamic) by comparing URL segments at matching depth; route groups contribute no URL segment, so nesting both under `(with-footer)/` does not change their URL depth relative to each other. The existing "static route precedence" e2e regression test continues to exercise the same guarantee.

## Interfaces / Contracts

```tsx
// app/(dashboard)/components/icons.tsx — add to icon set
export function Home(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}
// add `Home,` to the exported `Icons = { ... }` object
```

```tsx
// app/(dashboard)/components/Sidebar.tsx — new sub-component, same file scope as MarketLinkGroups
function InicioLink({ activeSlug, onLinkClick }: { activeSlug: string; onLinkClick?: () => void }) {
  const active = activeSlug === 'inicio';
  return (
    <Link
      href="/dashboard/inicio"
      data-testid="sidebar-link-inicio"
      aria-current={active ? 'page' : undefined}
      onClick={onLinkClick}
      className={
        'flex items-center gap-3 rounded-md border-r-2 px-3 py-2 text-sm transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-100 ' +
        (active
          ? 'border-buy bg-buy/10 font-semibold text-buy'
          : 'border-transparent text-zinc-400 hover:bg-zinc-900')
      }
    >
      <Icons.Home className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Inicio</span>
    </Link>
  );
}
```

Called once between the branding `<div>` and `<MarketLinkGroups>` in both the desktop `<nav>` and the mobile drawer's `<nav>` in `Sidebar()`. `activeSlug` fallback: `pathname?.split('/')[2] ?? 'inicio'`.

### `app/dashboard/inicio/page.tsx` (new, Server Component, no `DashboardHeader`)

```tsx
import Link from 'next/link';

export default function InicioPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Plataforma FAF</span>
        <h1 className="text-2xl font-semibold text-zinc-50">Bienvenido a la Plataforma FAF</h1>
      </header>
      <div className="flex max-w-2xl flex-col gap-4 text-sm text-zinc-400">
        <p>
          FAF (Marco Argumentativo Financiero) es un framework de decisión determinístico: cada recomendación
          BUY/SELL se deriva combinando evidencia técnica (γ, ρ) sobre un umbral fijo θ = 0.67, sin texto
          generado por IA en el cálculo central de la decisión.
        </p>
        <p>
          Actualmente el único mercado con datos reales en producción es Criptomonedas — el resto de los
          mercados listados en el menú lateral son vistas "próximamente".
        </p>
      </div>
      <Link
        href="/dashboard/crypto"
        className="w-fit rounded-md border border-buy bg-buy/10 px-4 py-2 text-sm font-semibold text-buy transition-colors hover:bg-buy/20"
      >
        Ver panel de Criptomonedas →
      </Link>
    </main>
  );
}
```

Uses the same `<span>` eyebrow / `<h1>` two-tone pattern as `DashboardHeader` (visual consistency: same font-mono uppercase tracking, same zinc/muted palette) but with landing-page copy ("Plataforma FAF" eyebrow, no "Panel de decisiones") instead of importing the component itself — deliberately distinct per the design decision above.

## Testing Strategy

Test updates are fully cataloged in `exploration.md` §9 and `proposal.md`'s affected-areas table; this phase does not redefine them, only confirms scope:

| Layer | What | File |
|---|---|---|
| Unit | Import path fix after `crypto/page.tsx` move | `tests/dashboard/crypto/page.test.ts` |
| E2E | Bare-`/dashboard` rewrite (lands on Inicio, not a crypto card) | `tests/e2e/dashboard.spec.ts` |
| E2E | New root-`/` → `/dashboard/inicio` test | `tests/e2e/dashboard.spec.ts` |
| E2E | Sidebar group-order assertion, prepend `'inicio'` | `tests/e2e/market-nav.spec.ts` |
| E2E | New Inicio `aria-current` positive/negative test | `tests/e2e/market-nav.spec.ts` |
| E2E | New "Inicio renders no `dashboard-footer`" test | `tests/e2e/market-nav.spec.ts` |
| E2E | Existing footer-copy tests (crypto/placeholder routes) | unaffected, no changes needed |

## Threat Matrix

N/A — routing here is Next.js file-based App Router routing (static/dynamic segment resolution, `redirect()` to internal literal paths) with no shell commands, subprocesses, VCS/PR automation, executable-file classification, or process integration. The threat-matrix's rows (documentation-path execution, git repo/commit/push/PR command composition) target CLI/VCS tooling, not client-side page routing, and do not apply here.

## Migration / Rollout

No data migration. Ship as a single PR (or two: routing+sidebar+icon, then footer route-group split, if the 400-line review budget requires splitting — left to `sdd-tasks`). Rollback: revert the PR; `crypto/`/`[market]/` can move back under the plain `app/dashboard/layout.tsx` independently of the redirect retarget if the route-group split alone needs reverting.

## Open Questions

None blocking. Inicio copy (heading/paragraphs) is placeholder-quality per proposal.md and may be refined further during apply without a design change.
