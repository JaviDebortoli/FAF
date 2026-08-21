import { notFound } from 'next/navigation';
import { MARKETS } from '@/app/(dashboard)/lib/markets';
import { MarketPlaceholder } from '@/app/(dashboard)/components/MarketPlaceholder';
import { DashboardHeader } from '@/app/(dashboard)/components/DashboardHeader';

/**
 * `market-nav-redesign` design.md "One dynamic segment `[market]/page.tsx`
 * for all placeholder markets" (Phase 3/PR3, task 3.3). Sibling of
 * `app/dashboard/(with-footer)/crypto/` under the real (non-parenthesized)
 * `app/dashboard/` segment — see the routing-correction note in
 * `app/dashboard/(with-footer)/crypto/page.tsx` and PR1's apply-progress for
 * why `app/(dashboard)/[market]/page.tsx` (the route group) would NOT
 * resolve to `/dashboard/{market}` URLs. Moved into the `(with-footer)`
 * route group by `inicio-home-section` design.md (footer exclusion
 * mechanism) — URL-neutral, this file still resolves to `/dashboard/{market}`.
 *
 * Next.js resolves the static `crypto/` segment before this sibling dynamic
 * `[market]` segment for an exact `/dashboard/crypto` match (standard App
 * Router static-over-dynamic precedence) — verified via the e2e regression
 * scenario in `tests/e2e/market-nav.spec.ts` ("static route precedence").
 *
 * Unknown slugs call `notFound()` (design.md's explicit guidance) instead of
 * silently rendering a placeholder for a nonexistent market.
 */
export default async function MarketPlaceholderPage({ params }: { params: Promise<{ market: string }> }) {
  const { market: slug } = await params;
  const market = MARKETS[slug];

  if (!market) {
    notFound();
  }

  return (
    // `inicio-visual-and-scroll-fix` — `min-h-[calc(100vh-12rem)]`, not
    // `min-h-screen`: this `<main>` is wrapped by `(with-footer)/layout.tsx`'s
    // `pb-48` (12rem = 192px), so `min-h-screen` here double-counts that
    // spacing, always rendering >= `100vh + 192px` and showing a phantom
    // vertical scrollbar even on short-content routes (`MarketPlaceholder`).
    // The `12rem` literal is coupled to that `pb-48` value — see the comment
    // there and on `crypto/page.tsx`'s identical `<main>`.
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-6xl flex-col gap-8 px-6 py-10">
      <DashboardHeader title={market.label} showDisclaimer />

      <MarketPlaceholder marketLabel={market.label} />
    </main>
  );
}
