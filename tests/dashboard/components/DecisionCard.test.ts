import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DecisionCard } from '@/app/(dashboard)/components/DecisionCard';
import type { Decision, Recommendation, ThesisState } from '@/src/domain/types';

/**
 * no-recommendation-filter-and-i18n Phase 1 (task 1.3) — D2 coercion-bug
 * regression test. `DecisionCard.tsx` used to coerce any non-BUY
 * recommendation to `'SELL'` (`recommendation === 'BUY' ? 'BUY' : 'SELL'`),
 * which silently mislabeled `NO_RECOMMENDATION` assets as SELL. This test
 * pins the real 3-way `data-recommendation` value on the rendered
 * `RecommendationBadge`, following this repo's `react-dom/server`
 * `renderToString` convention (no JSX in this `.test.ts` file — the
 * `vitest.config.ts` `include` glob is `.test.ts` only, and `.ts` files use
 * esbuild's non-JSX loader; components are called as plain functions).
 */

const emptyThesis: ThesisState = {
  thesis: 'bullish',
  supporters: [],
  aggregated: { gamma: 0, rho: 0 },
  net: { gamma: 0, rho: 0 },
  score: 0,
};

function decisionFixture(asset: string, recommendation: Recommendation): Decision {
  return {
    asset,
    t: 1_700_000_000_000,
    recommendation,
    bullish: { ...emptyThesis, net: { gamma: 0.75, rho: 0.05 } },
    bearish: { ...emptyThesis, net: { gamma: 0.2, rho: 0.3 } },
    gap: 0.4,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [] },
  };
}

describe('DecisionCard — recommendation passthrough (no BUY/SELL coercion)', () => {
  it('renders data-recommendation="NO_RECOMMENDATION" for a NO_RECOMMENDATION decision, not "SELL"', () => {
    const decision = decisionFixture('SOLUSDT', 'NO_RECOMMENDATION');

    const html = renderToString(DecisionCard({ decision, onSelect: () => {} }));

    expect(html).toContain('data-recommendation="NO_RECOMMENDATION"');
    expect(html).not.toContain('data-recommendation="SELL"');
  });

  it('regression: still renders data-recommendation="BUY" for a BUY decision', () => {
    const decision = decisionFixture('BTCUSDT', 'BUY');

    const html = renderToString(DecisionCard({ decision, onSelect: () => {} }));

    expect(html).toContain('data-recommendation="BUY"');
  });

  it('regression: still renders data-recommendation="SELL" for a SELL decision', () => {
    const decision = decisionFixture('ETHUSDT', 'SELL');

    const html = renderToString(DecisionCard({ decision, onSelect: () => {} }));

    expect(html).toContain('data-recommendation="SELL"');
  });
});
