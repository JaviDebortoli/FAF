import type { Recommendation } from '@/src/domain/types';
import { translateRecommendation } from '../lib/i18n';

interface RecommendationBadgeProps {
  /** no-recommendation-filter-and-i18n D1/D2 — `NO_RECOMMENDATION` cards are
   * now visible (Tier 1's hide-invariant is reversed), so this component
   * must accept the full 3-way `Recommendation` union, not just BUY/SELL. */
  recommendation: Recommendation;
}

/**
 * design.md "Card overview (Tier 1)": every card MUST show a badge
 * reflecting its recommendation state — BUY/SELL use the shared semantic
 * color tokens (`--color-buy`/`--color-sell`, same ones the gauge and
 * sparkline consume); `NO_RECOMMENDATION` uses the muted/inactive
 * `--color-inactive` token instead of a directional badge treatment
 * (no-recommendation-filter-and-i18n D2/D1). The label is Spanish
 * (`translateRecommendation`, all three branches) — `data-recommendation`
 * keeps the raw English literal as the stable machine identifier. No
 * `'use client'` — pure presentational, environment-agnostic (design.md
 * "Client/server boundary").
 */
export function RecommendationBadge({ recommendation }: RecommendationBadgeProps) {
  const variant = recommendation === 'BUY' ? 'buy' : recommendation === 'SELL' ? 'sell' : 'inactive';

  const variantClassName =
    variant === 'buy'
      ? 'border-buy/40 bg-buy/10 text-buy'
      : variant === 'sell'
        ? 'border-sell/40 bg-sell/10 text-sell'
        : 'border-inactive/40 bg-inactive/10 text-inactive';

  const dotClassName = variant === 'buy' ? 'bg-buy' : variant === 'sell' ? 'bg-sell' : 'bg-inactive';

  return (
    <span
      data-testid="recommendation-badge"
      data-recommendation={recommendation}
      className={
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide ' +
        variantClassName
      }
    >
      <span aria-hidden="true" className={'h-1.5 w-1.5 rounded-full ' + dotClassName} />
      {translateRecommendation(recommendation)}
    </span>
  );
}
