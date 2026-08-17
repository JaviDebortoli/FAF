import type { Recommendation } from '@/src/domain/types';

interface RecommendationBadgeProps {
  /** `NO_RECOMMENDATION` is never eligible for a card (`lib/select.ts`), so
   * this component only ever receives an actionable direction. */
  recommendation: Extract<Recommendation, 'BUY' | 'SELL'>;
}

/**
 * design.md "Card overview (Tier 1)": every card MUST show a BUY/SELL badge
 * using the shared semantic color tokens (`--color-buy`/`--color-sell`, same
 * ones the gauge and sparkline consume). No `'use client'` — pure
 * presentational, environment-agnostic (design.md "Client/server boundary").
 */
export function RecommendationBadge({ recommendation }: RecommendationBadgeProps) {
  const isBuy = recommendation === 'BUY';

  return (
    <span
      data-testid="recommendation-badge"
      data-recommendation={recommendation}
      className={
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide ' +
        (isBuy ? 'border-buy/40 bg-buy/10 text-buy' : 'border-sell/40 bg-sell/10 text-sell')
      }
    >
      <span aria-hidden="true" className={'h-1.5 w-1.5 rounded-full ' + (isBuy ? 'bg-buy' : 'bg-sell')} />
      {recommendation}
    </span>
  );
}
