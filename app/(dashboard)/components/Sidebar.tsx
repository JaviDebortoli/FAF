'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MARKETS, MARKET_GROUPS } from '../lib/markets';
import { Icons } from './icons';

/**
 * `market-nav-redesign` design.md "Component Contracts" / "Decision: Sidebar
 * is a single client component" — entirely `'use client'` because App Router
 * Server Components have no pathname without a middleware shim, and
 * `aria-current` must be computed per-link on every render, not only inside
 * a drawer. Desktop-only in this PR (Phase 2/PR2, task 2.5); Phase 4/PR4
 * adds the mobile hamburger + drawer on top of this same component using
 * `Icons.Menu`/`Icons.Close`.
 *
 * Wired into `app/dashboard/layout.tsx` (the real, non-parenthesized route
 * segment — see that file's header comment and PR1's apply-progress for why
 * `app/(dashboard)/layout.tsx` is NOT the wiring target).
 */
export function Sidebar() {
  const pathname = usePathname();
  const activeSlug = pathname?.split('/')[2] ?? 'crypto';

  return (
    <nav
      aria-label="Mercados"
      className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:gap-6 md:overflow-y-auto md:border-r md:border-zinc-800 md:bg-zinc-950 md:px-4 md:py-6"
    >
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
    </nav>
  );
}
