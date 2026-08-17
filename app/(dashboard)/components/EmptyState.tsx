interface EmptyStateProps {
  /** `no-active` = nothing actionable this cycle (all NO_RECOMMENDATION);
   * `filtered` = the direction filter excluded every actionable card. */
  variant: 'no-active' | 'filtered';
  direction?: 'BUY' | 'SELL';
}

/**
 * design.md "Tier 1 selection rule": two distinct empty-state copies so the
 * filter never *looks* broken. Spanish copy (narrative-language decision for
 * this change), active voice, no apology — an instrument-panel status line,
 * not a generic illustration placeholder. No `'use client'` — pure/shared.
 */
export function EmptyState({ variant, direction }: EmptyStateProps) {
  const isFiltered = variant === 'filtered';
  const headline = isFiltered ? `Sin resultados para ${direction}` : 'Sin recomendaciones activas en este momento';
  const status = isFiltered ? `0 COINCIDENCIAS · ${direction}` : '0 ACTIVAS';

  return (
    <div
      data-testid="empty-state"
      data-variant={variant}
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 px-6 py-16 text-center"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{status}</span>
      <p className="max-w-sm text-sm text-zinc-400">{headline}</p>
    </div>
  );
}
