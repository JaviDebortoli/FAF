import { describe, expect, it } from 'vitest';
import { evaluateGraph } from '@/src/laf/graph';
import { decide } from '@/src/decision/policy';
import type { Evidence, EvidencePredicate, Label } from '@/src/domain/types';

// Golden #2 (design.md "Testing Strategy"): the algebra golden, built directly
// from the paper's §3 controlled-example labels, bypassing L1/L2 indicator
// math entirely. If an L2 formula regresses, this golden still isolates and
// proves the L3 (this file, part 1/2) and L4 (part 2/2, appended in Phase 2)
// pipeline is correct independently.

function makeEvidence(predicate: EvidencePredicate, label: Label): Evidence {
  return {
    predicate,
    label,
    t: 1_700_000_000_000,
    asset: 'BTCUSDT',
    window: { indicator: 'RSI', omega: 14, beta: 1 },
    provenance: {
      indicatorEventIri: `faf:event_BTCUSDT_${predicate}_1700000000000`,
      priceEventIris: ['faf:event_BTCUSDT_price_1700000000000'],
      rawValue: 0,
      sigmaOmega: 0,
    },
  };
}

// Paper §3 controlled example: e1=rsi_bullish, e2=macd_bullish, e3=sma_bearish.
const evidences: Evidence[] = [
  makeEvidence('rsi_bullish', { gamma: 0.5, rho: 0.4 }),
  makeEvidence('macd_bullish', { gamma: 0.8, rho: 0.1 }),
  makeEvidence('sma_bearish', { gamma: 0.15, rho: 0.3 }),
];

describe('Golden #2 (part 1/2) — algebra-only, L3 pipeline over paper labels', () => {
  it('reproduces lambda(mu+), lambda(mu-), lambda*(mu+), lambda*(mu-) at 1e-9 tolerance', () => {
    const { bullish, bearish } = evaluateGraph(evidences);

    // lambda(mu+) / lambda(mu-) — aggregation (eq. 5/7)
    expect(bullish.aggregated.gamma).toBeCloseTo(0.65, 9);
    expect(bullish.aggregated.rho).toBeCloseTo(0.25, 9);
    expect(bearish.aggregated.gamma).toBeCloseTo(0.15, 9);
    expect(bearish.aggregated.rho).toBeCloseTo(0.3, 9);

    // lambda*(mu+) / lambda*(mu-) — conflict resolution (eq. 6, 8-9)
    expect(bullish.net.gamma).toBeCloseTo(0.5, 9);
    expect(bullish.net.rho).toBeCloseTo(0, 9);
    expect(bearish.net.gamma).toBeCloseTo(0, 9);
    expect(bearish.net.rho).toBeCloseTo(0.05, 9);
  });
});

describe('Golden #2 (part 2/2) — decision policy over the Phase-1 evidence', () => {
  it('reproduces sigma+=0.75, sigma-=0.475, gap=0.275 -> BUY (eq. 10-11)', () => {
    const { bullish, bearish } = evaluateGraph(evidences);
    const ctx = { asset: 'BTCUSDT', t: 1_700_000_000_000, candles: [], turtle: '', evidences };

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('BUY');
    expect(decision.gap).toBeCloseTo(0.275, 9);
    expect(decision.thresholds).toEqual({ theta: 0.67, delta: 0.2 });

    // Cross-check the individual scores per eq. 10 that produce the gap above.
    const sigmaPlus = 0.5 * bullish.net.gamma + 0.5 * (1 - bullish.net.rho);
    const sigmaMinus = 0.5 * bearish.net.gamma + 0.5 * (1 - bearish.net.rho);
    expect(sigmaPlus).toBeCloseTo(0.75, 9);
    expect(sigmaMinus).toBeCloseTo(0.475, 9);
  });
});
