import { notFound } from 'next/navigation';
import { MARKETS } from '@/app/(dashboard)/lib/markets';
import { MarketPlaceholder } from '@/app/(dashboard)/components/MarketPlaceholder';
import { DashboardHeader } from '@/app/(dashboard)/components/DashboardHeader';

/**
 * `market-nav-redesign` design.md "One dynamic segment `[market]/page.tsx`
 * for all placeholder markets" (Phase 3/PR3, task 3.3). Sibling of
 * `app/dashboard/crypto/` under the real (non-parenthesized) `app/dashboard/`
 * segment — see the routing-correction note in `app/dashboard/crypto/page.tsx`
 * and PR1's apply-progress for why `app/(dashboard)/[market]/page.tsx` (the
 * route group) would NOT resolve to `/dashboard/{market}` URLs.
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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <DashboardHeader title={market.label} showDisclaimer />

      <MarketPlaceholder marketLabel={market.label} />
    </main>
  );
}
