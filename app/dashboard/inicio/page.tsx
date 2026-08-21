import Link from 'next/link';

/**
 * `inicio-home-section` design.md — new default landing page for the FAF
 * platform. Static Server Component sibling of `app/dashboard/(with-footer)/crypto/page.tsx`,
 * intentionally NOT routed through `[market]/page.tsx` (Inicio is absent from
 * `MARKETS`/`MARKET_GROUPS` — it is not a market). Both redirect shims
 * (`app/dashboard/page.tsx`, `app/(dashboard)/page.tsx`) now land here first,
 * so a first-time visitor is oriented ("deterministic, non-AI argumentative
 * framework") before dropping into live market data via the CTA below.
 *
 * Uses a page-local heading (eyebrow `<span>` + `<h1>`), not `DashboardHeader`
 * — `DashboardHeader` is purpose-built for market views ("Panel de
 * decisiones" eyebrow + market-label `<h1>`); reusing it here would
 * misrepresent Inicio as a market panel (design.md "Architecture Decisions").
 *
 * Lives outside the `app/dashboard/(with-footer)/` route group — the shared
 * `dashboard-footer` MUST NOT render on this route
 * (specs/market-navigation/spec.md "Shared shell footer" — "The Inicio route
 * MUST NOT render the dashboard-footer element at all").
 */
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
