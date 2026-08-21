import { OverviewClient } from '@/app/(dashboard)/components/OverviewClient';
import { DashboardHeader } from '@/app/(dashboard)/components/DashboardHeader';
import { MARKETS } from '@/app/(dashboard)/lib/markets';

/**
 * `market-nav-redesign` design.md — moved verbatim from `app/(dashboard)/page.tsx`
 * (Phase 1, task 1.3). `OverviewClient` and everything it mounts (`DirectionFilter`,
 * `DecisionCard`, `ScoreGauge`, `DrilldownPanel`, etc.) is byte-for-byte unchanged;
 * only the host route moved to `/dashboard/crypto` — the canonical route for the
 * one market with real backend data.
 *
 * `inicio-home-section` design.md: bare `/dashboard` and root `/` no longer
 * redirect straight here — both now land on `/dashboard/inicio` (see
 * `app/dashboard/page.tsx`, `app/(dashboard)/page.tsx`), which links to this
 * page via its CTA. This route also moved into the `(with-footer)` route
 * group (URL-neutral) so the shared footer renders here but not on Inicio.
 *
 * Routing note (deviation from `design.md`'s literal file paths — see apply-progress
 * "Deviations from Design"): `app/(dashboard)` is a Next.js *route group*
 * (parenthesized folder name) and contributes NO URL segment — it already mapped to
 * `/`, not `/dashboard`. `design.md`/`tasks.md` specified this file at
 * `app/(dashboard)/crypto/page.tsx`, which would have resolved to `/crypto`, not
 * `/dashboard/crypto` as every scenario in `specs/market-navigation/spec.md` and
 * `specs/decision-dashboard/spec.md` requires verbatim. This file therefore lives
 * under the real (non-parenthesized) `app/dashboard/` segment instead, importing the
 * unchanged shared components from `app/(dashboard)/components/` via the `@/` alias.
 *
 * design.md "Component Architecture" — Server Component: static chrome
 * (title, thesis framing, footer/AI disclaimer context) rendered server-side
 * so it is present even if hydration fails, plus the `OverviewClient` client
 * island that owns the fetch/poll/filter/selection state. Tier 1 only: zero
 * LLM text, zero node-edge graph (requirement "LLM narrative and graph
 * visualization confined to Tier 2").
 */
export default function CryptoDashboardPage() {
  // `noUncheckedIndexedAccess` (tsconfig.json) types `MARKETS.crypto` as
  // possibly `undefined` even for this literal, statically-guaranteed key —
  // same defensive-guard convention `Sidebar.tsx`'s `MarketLinkGroups` uses
  // for `MARKETS[slug]`, not a non-null assertion (see apply-progress
  // "Deviations from Design").
  const cryptoMarket = MARKETS.crypto;
  if (!cryptoMarket) {
    throw new Error('MARKETS.crypto is missing from the market catalog');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <DashboardHeader title={cryptoMarket.label} showDisclaimer />

      <OverviewClient />
    </main>
  );
}
