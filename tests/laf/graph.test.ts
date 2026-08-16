import { describe, expect, it } from 'vitest';
import { evaluateGraph } from '@/src/laf/graph';
import type { Evidence, EvidencePredicate, Label } from '@/src/domain/types';

// FAF paper design.md sequence diagram (b): fixed topology (Budán Fig. 5(a)) —
// 8 evidence leaves -> 2 RA aggregation groups (AP/AN) -> 1 CA conflict resolution.

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

describe('evaluateGraph — fixed topology (8 leaves -> 2 RA -> 1 CA)', () => {
  it('routes all 8 predicates through their rule to the correct thesis group (4 supporters each)', () => {
    const evidences: Evidence[] = [
      makeEvidence('rsi_bullish', { gamma: 0.4, rho: 0.2 }),
      makeEvidence('macd_bullish', { gamma: 0.6, rho: 0.1 }),
      makeEvidence('sma_bullish', { gamma: 0.8, rho: 0.3 }),
      makeEvidence('bollinger_bullish', { gamma: 0.2, rho: 0.4 }),
      makeEvidence('rsi_bearish', { gamma: 0.2, rho: 0.6 }),
      makeEvidence('macd_bearish', { gamma: 0.2, rho: 0.6 }),
      makeEvidence('sma_bearish', { gamma: 0.2, rho: 0.6 }),
      makeEvidence('bollinger_bearish', { gamma: 0.2, rho: 0.6 }),
    ];

    const { bullish, bearish } = evaluateGraph(evidences);

    expect(bullish.supporters).toHaveLength(4);
    expect(bearish.supporters).toHaveLength(4);
    expect(bullish.supporters.map((a) => a.rule).sort()).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(bearish.supporters.map((a) => a.rule).sort()).toEqual(['R5', 'R6', 'R7', 'R8']);

    // aggregated (oplus, unweighted mean)
    expect(bullish.aggregated.gamma).toBeCloseTo(0.5, 9);
    expect(bullish.aggregated.rho).toBeCloseTo(0.25, 9);
    expect(bearish.aggregated.gamma).toBeCloseTo(0.2, 9);
    expect(bearish.aggregated.rho).toBeCloseTo(0.6, 9);

    // net (ominus, clamped at 0)
    expect(bullish.net.gamma).toBeCloseTo(0.3, 9);
    expect(bullish.net.rho).toBeCloseTo(0, 9);
    expect(bearish.net.gamma).toBeCloseTo(0, 9);
    expect(bearish.net.rho).toBeCloseTo(0.35, 9);
  });

  it('reproduces the paper e1/e2/e3 partial-evidence subset (spec golden trace)', () => {
    const evidences: Evidence[] = [
      makeEvidence('rsi_bullish', { gamma: 0.5, rho: 0.4 }),
      makeEvidence('macd_bullish', { gamma: 0.8, rho: 0.1 }),
      makeEvidence('sma_bearish', { gamma: 0.15, rho: 0.3 }),
    ];

    const { bullish, bearish } = evaluateGraph(evidences);

    expect(bullish.supporters).toHaveLength(2);
    expect(bearish.supporters).toHaveLength(1);

    expect(bullish.aggregated.gamma).toBeCloseTo(0.65, 9);
    expect(bullish.aggregated.rho).toBeCloseTo(0.25, 9);
    expect(bearish.aggregated.gamma).toBeCloseTo(0.15, 9);
    expect(bearish.aggregated.rho).toBeCloseTo(0.3, 9);

    expect(bullish.net.gamma).toBeCloseTo(0.5, 9);
    expect(bullish.net.rho).toBeCloseTo(0, 9);
    expect(bearish.net.gamma).toBeCloseTo(0, 9);
    expect(bearish.net.rho).toBeCloseTo(0.05, 9);
  });

  it('handles zero active evidence: both theses aggregate/net to <0,0>', () => {
    const { bullish, bearish } = evaluateGraph([]);

    expect(bullish.supporters).toHaveLength(0);
    expect(bearish.supporters).toHaveLength(0);
    expect(bullish.aggregated).toEqual({ gamma: 0, rho: 0 });
    expect(bearish.aggregated).toEqual({ gamma: 0, rho: 0 });
    expect(bullish.net).toEqual({ gamma: 0, rho: 0 });
    expect(bearish.net).toEqual({ gamma: 0, rho: 0 });
  });
});
