import type { Direction } from '../lib/select';

interface EmptyStateProps {
  /** `no-active` = the report itself has zero decisions (genuinely empty —
   * no-recommendation-filter-and-i18n D1 rescoped this from "nothing
   * actionable this cycle", since NO_RECOMMENDATION assets now render their
   * own muted card and are never "empty"); `filtered` = the direction filter
   * excluded every card from a non-empty report. */
  variant: 'no-active' | 'filtered';
  /** `'ALL'` can never reach the `filtered` variant — an empty `ALL` result
   * means the report itself is empty, which is the `no-active` case. */
  direction?: Exclude<Direction, 'ALL'>;
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
