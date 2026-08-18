interface MarketPlaceholderProps {
  /** Display label from `lib/markets.ts`'s `MARKETS` record (e.g. "Forex"),
   * used to personalize the "próximamente" copy. */
  marketLabel: string;
}

/**
 * `market-nav-redesign` design.md "Component Contracts" (Phase 3/PR3, task
 * 3.2) — shared placeholder for every non-crypto market route. Reuses the
 * `role="status"` / dashed-border visual convention established by
 * `EmptyState`/`ServiceUnavailable`, but with its own distinct
 * `data-testid="market-placeholder"` per `specs/market-navigation/spec.md`
 * ("Placeholder is testably distinct from other empty/unavailable states").
 *
 * Locked proposal decision (proposal.md question 1, resolved as no CTA):
 * zero call-to-action / interest-capture / "notify me" affordance of any
 * kind — purely informational. No `'use client'` — pure/shared, same as
 * `EmptyState`.
 */
export function MarketPlaceholder({ marketLabel }: MarketPlaceholderProps) {
  return (
    <div
      data-testid="market-placeholder"
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 px-6 py-16 text-center"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">PRÓXIMAMENTE</span>
      <p className="max-w-sm text-sm text-zinc-400">{marketLabel} todavía no está disponible en la plataforma.</p>
    </div>
  );
}
