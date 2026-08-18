import { OverviewClient } from '@/app/(dashboard)/components/OverviewClient';

/**
 * `market-nav-redesign` design.md — moved verbatim from `app/(dashboard)/page.tsx`
 * (Phase 1, task 1.3). `OverviewClient` and everything it mounts (`DirectionFilter`,
 * `DecisionCard`, `ScoreGauge`, `DrilldownPanel`, etc.) is byte-for-byte unchanged;
 * only the host route moved to `/dashboard/crypto` — the canonical route for the
 * one market with real backend data. Bare `/dashboard` redirects here (see
 * `app/dashboard/page.tsx`); the pre-existing root `/` also redirects here (see
 * `app/(dashboard)/page.tsx`) so neither bookmark 404s.
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
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">FAF · Panel de decisiones</span>
        <h1 className="text-2xl font-semibold text-zinc-50">Recomendaciones activas</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el
          framework argumentativo. Esta vista no contiene texto generado por IA.
        </p>
      </header>

      <OverviewClient />
    </main>
  );
}
