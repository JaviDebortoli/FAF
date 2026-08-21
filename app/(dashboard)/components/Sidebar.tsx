'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MARKETS, MARKET_GROUPS } from '../lib/markets';
import { Icons } from './icons';

/**
 * Shared market-link-list rendering, used verbatim by both the desktop
 * sidebar and the mobile drawer (Phase 4/PR4) — extracted so the two nav
 * surfaces never duplicate `MARKET_GROUPS`/`MARKETS` JSX (design.md "Sidebar
 * is a single client component" + `specs/market-navigation/spec.md`
 * "Mobile navigation drawer": drawer MUST list the same markets, in the
 * same groups and order, as the desktop sidebar). `onLinkClick` is used by
 * the mobile drawer to close itself on navigation; desktop passes nothing.
 */
function MarketLinkGroups({ activeSlug, onLinkClick }: { activeSlug: string; onLinkClick?: () => void }) {
  return (
    <>
      {MARKET_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <h2 className="px-3 pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{group.label}</h2>
          <ul className="flex flex-col gap-0.5">
            {group.slugs.map((slug) => {
              const market = MARKETS[slug];
              if (!market) return null;
              const Icon = Icons[market.icon];
              const active = slug === activeSlug;

              return (
                <li key={slug}>
                  <Link
                    href={`/dashboard/${slug}`}
                    data-testid={`sidebar-link-${slug}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={onLinkClick}
                    className={
                      'flex items-center gap-3 rounded-md border-r-2 px-3 py-2 text-sm transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-100 ' +
                      (active
                        ? 'border-buy bg-buy/10 font-semibold text-buy'
                        : 'border-transparent text-zinc-400 hover:bg-zinc-900')
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{market.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * `inicio-home-section` design.md "Interfaces / Contracts" — the sidebar's
 * "Inicio" entry, styled identically to a market link (same className/
 * active-state pattern as `MarketLinkGroups` above — extracted separately
 * rather than folded into that component because Inicio isn't a market: it
 * has no `MARKETS`/`MARKET_GROUPS` entry, no dynamic slug-to-market lookup,
 * and always renders exactly once, not per-group). Rendered between the
 * branding block and `<MarketLinkGroups>` in both the desktop `<nav>` and the
 * mobile drawer (specs/market-navigation/spec.md "Inicio link renders between
 * branding and market groups").
 */
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

/**
 * `market-nav-redesign` design.md "Component Contracts" / "Decision: Sidebar
 * is a single client component" — entirely `'use client'` because App Router
 * Server Components have no pathname without a middleware shim, and
 * `aria-current` must be computed per-link on every render, not only inside
 * a drawer.
 *
 * Phase 4/PR4 (tasks 4.1-4.2): adds the mobile hamburger trigger + drawer
 * overlay on top of the Phase 2/PR2 desktop-only nav, reusing
 * `MarketLinkGroups` above so the drawer is never a second copy of the
 * market list. The drawer closes on close-button click, backdrop click, and
 * link click/navigation (design.md: "closes on link click and on overlay
 * click"); the desktop `<nav>` stays `hidden md:flex` (Phase 2) and the
 * mobile trigger is its exact visibility inverse (`md:hidden`), so at any
 * viewport width exactly one "Mercados" nav landmark is ever mounted.
 *
 * Wired into `app/dashboard/layout.tsx` (the real, non-parenthesized route
 * segment — see that file's header comment and PR1's apply-progress for why
 * `app/(dashboard)/layout.tsx` is NOT the wiring target).
 *
 * `inicio-home-section` design.md — `activeSlug` fallback changed from
 * `'crypto'` to `'inicio'`: Inicio is now the platform's default landing
 * page, so the fallback used before `pathname` resolves on first render
 * should match the new default, not the old one.
 */
export function Sidebar() {
  const pathname = usePathname();
  const activeSlug = pathname?.split('/')[2] ?? 'inicio';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Mercados"
        data-testid="sidebar-desktop-nav"
        className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:gap-6 md:overflow-y-auto md:border-r md:border-zinc-800 md:bg-zinc-950 md:px-4 md:py-6"
      >
        <div data-testid="sidebar-branding" className="px-3">
          <h1 className="text-lg font-bold tracking-tight text-zinc-50">Plataforma FAF</h1>
          <p className="mt-1 text-xs text-muted">Recomendaciones financieras explicables en tiempo real</p>
        </div>
        <InicioLink activeSlug={activeSlug} />
        <MarketLinkGroups activeSlug={activeSlug} />
      </nav>

      <button
        type="button"
        data-testid="sidebar-mobile-toggle"
        aria-label="Abrir menú de mercados"
        onClick={() => setMobileOpen(true)}
        className="fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-100 md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-100"
      >
        <Icons.Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" data-testid="sidebar-mobile-drawer">
          <div
            className="absolute inset-0 bg-black/60"
            data-testid="sidebar-mobile-backdrop"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            aria-label="Mercados"
            className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 overflow-y-auto border-r border-zinc-800 bg-zinc-950 px-4 py-6"
          >
            <div data-testid="sidebar-branding" className="px-3">
              <h1 className="text-lg font-bold tracking-tight text-zinc-50">Plataforma FAF</h1>
              <p className="mt-1 text-xs text-muted">Recomendaciones financieras explicables en tiempo real</p>
            </div>
            <div className="flex items-center justify-between px-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Mercados</span>
              <button
                type="button"
                data-testid="sidebar-mobile-close"
                aria-label="Cerrar menú de mercados"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-100"
              >
                <Icons.Close className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <InicioLink activeSlug={activeSlug} onLinkClick={() => setMobileOpen(false)} />
            <MarketLinkGroups activeSlug={activeSlug} onLinkClick={() => setMobileOpen(false)} />
          </nav>
        </div>
      )}
    </>
  );
}
