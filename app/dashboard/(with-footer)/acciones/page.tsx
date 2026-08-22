import { OverviewClient } from '@/app/(dashboard)/components/OverviewClient';
import { DashboardHeader } from '@/app/(dashboard)/components/DashboardHeader';
import { MARKETS } from '@/app/(dashboard)/lib/markets';

/**
 * `acciones-market-integration` design.md D-D / task D.7 — mechanical clone
 * of `app/dashboard/(with-footer)/crypto/page.tsx`, the sibling static route
 * for the second real market. `OverviewClient` and everything it mounts
 * (`DirectionFilter`, `DecisionCard`, `ScoreGauge`, `DrilldownPanel`, etc.)
 * is byte-for-byte unchanged; only `MARKETS.acciones` and the `market`
 * literal passed to `OverviewClient` differ from `crypto/page.tsx`.
 *
 * Same static-over-dynamic Next.js route precedence as `crypto/page.tsx`:
 * this static `acciones/` segment resolves before the sibling dynamic
 * `[market]/page.tsx` for an exact `/dashboard/acciones` match, so this
 * route now hosts the real Tier 1 overview instead of the shared
 * `MarketPlaceholder` `[market]/page.tsx` renders for every other,
 * non-real market (specs/market-navigation/spec.md "Acciones route hosts
 * its own real dashboard").
 *
 * design.md "Component Architecture" — Server Component: static chrome
 * (title, thesis framing, footer/AI disclaimer context) rendered server-side
 * so it is present even if hydration fails, plus the `OverviewClient` client
 * island that owns the fetch/poll/filter/selection state. Tier 1 only: zero
 * LLM text, zero node-edge graph (requirement "LLM narrative and graph
 * visualization confined to Tier 2").
 */
export default function AccionesDashboardPage() {
  // `noUncheckedIndexedAccess` (tsconfig.json) types `MARKETS.acciones` as
  // possibly `undefined` even for this literal, statically-guaranteed key —
  // same defensive-guard convention `crypto/page.tsx` uses for
  // `MARKETS.crypto`, not a non-null assertion.
  const accionesMarket = MARKETS.acciones;
  if (!accionesMarket) {
    throw new Error('MARKETS.acciones is missing from the market catalog');
  }

  return (
    // `inicio-visual-and-scroll-fix` — `min-h-[calc(100vh-12rem)]`, not
    // `min-h-screen`: this `<main>` is wrapped by `(with-footer)/layout.tsx`'s
    // `pb-48` (12rem = 192px), so `min-h-screen` here double-counts that
    // spacing, always rendering >= `100vh + 192px` and showing a phantom
    // vertical scrollbar even on short-content routes (`EmptyState`). The
    // `12rem` literal is coupled to that `pb-48` value — see the comment
    // there and on `crypto/page.tsx`'s/`[market]/page.tsx`'s identical
    // `<main>`.
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-6xl flex-col gap-8 px-6 py-10">
      <DashboardHeader title={accionesMarket.label} showDisclaimer />

      <OverviewClient market="acciones" />
    </main>
  );
}
