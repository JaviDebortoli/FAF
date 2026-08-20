interface DashboardHeaderProps {
  /** Rendered as the <h1>. Callers pass `MARKETS[slug].label` — no new
   * hardcoded market-name literals. */
  title: string;
  /** When true, renders the determinism disclaimer paragraph verbatim
   * below the title. Defaults to false (opt-in, not opt-out) so a future
   * caller doesn't inherit it silently. */
  showDisclaimer?: boolean;
}

/**
 * `dashboard-header-copy-consistency` design.md "Extract shared
 * DashboardHeader component" — shared header for every `/dashboard/*`
 * market view. Fixes the copy drift where the eyebrow carried a redundant
 * "FAF · " prefix and the determinism disclaimer only rendered on the
 * crypto view. No `'use client'` — pure/shared, same as `MarketPlaceholder`.
 */
export function DashboardHeader({ title, showDisclaimer = false }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Panel de decisiones</span>
      <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
      {showDisclaimer && (
        <p className="max-w-2xl text-sm text-zinc-400">
          Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el
          framework argumentativo. Esta vista no contiene texto generado por IA.
        </p>
      )}
    </header>
  );
}
