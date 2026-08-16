import { describe, expect, it } from 'vitest';
import { score, decide, THETA, DELTA } from '@/src/decision/policy';
import type { Argument, Candle, Evidence, Label, ThesisState } from '@/src/domain/types';

// FAF paper eq. 10-11, §3.5 — decision policy: score sigma(mu), thresholds
// theta=0.67 / delta=0.20, three-way BUY/SELL/NO_RECOMMENDATION rule.

const dummyEvidence: Evidence = {
  predicate: 'rsi_bullish',
  label: { gamma: 0.5, rho: 0.4 },
  t: 1_700_000_000_000,
  asset: 'BTCUSDT',
  window: { indicator: 'RSI', omega: 14, beta: 1 },
  provenance: {
    indicatorEventIri: 'faf:event_BTCUSDT_rsi_bullish_1700000000000',
    priceEventIris: ['faf:event_BTCUSDT_price_1700000000000'],
    rawValue: 0,
    sigmaOmega: 0,
  },
};

const dummyArgument: Argument = {
  rule: 'R1',
  thesis: 'bullish',
  label: dummyEvidence.label,
  evidence: dummyEvidence,
};

function thesisState(thesis: 'bullish' | 'bearish', net: Label, hasSupporters: boolean): ThesisState {
  return {
    thesis,
    supporters: hasSupporters ? [dummyArgument] : [],
    aggregated: net,
    net,
    score: 0, // decide()/score() must recompute from `net`, not trust this stale field
  };
}

const ctx = { asset: 'BTCUSDT', t: 1_700_000_000_000, candles: [], turtle: '', evidences: [] };

describe('score (eq. 10)', () => {
  it('computes sigma(mu+)=0.75 and sigma(mu-)=0.475 from the paper golden net labels', () => {
    expect(score({ gamma: 0.5, rho: 0 })).toBeCloseTo(0.75, 9);
    expect(score({ gamma: 0, rho: 0.05 })).toBeCloseTo(0.475, 9);
  });

  it('computes 0.5*gamma + 0.5*(1-rho) for an arbitrary label', () => {
    expect(score({ gamma: 0.2, rho: 0.6 })).toBeCloseTo(0.5 * 0.2 + 0.5 * (1 - 0.6), 9);
  });
});

describe('thresholds theta and delta', () => {
  it('are fixed at 0.67 and 0.20', () => {
    expect(THETA).toBe(0.67);
    expect(DELTA).toBe(0.2);
  });
});

describe('decide (three-way rule, eq. 11)', () => {
  it('BUY on the exact boundary sigma=0.67 with sufficient gap', () => {
    const bullish = thesisState('bullish', { gamma: 0.34, rho: 0 }, true); // score = 0.67 exact
    const bearish = thesisState('bearish', { gamma: 0, rho: 1 }, true); // score = 0

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('BUY');
    expect(decision.gap).toBeCloseTo(0.67, 9);
  });

  it('BUY on the exact boundary gap=0.20', () => {
    const bullish = thesisState('bullish', { gamma: 0.74, rho: 0 }, true); // score = 0.87
    const bearish = thesisState('bearish', { gamma: 0.34, rho: 0 }, true); // score = 0.67

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('BUY');
    expect(decision.gap).toBeCloseTo(0.2, 9);
  });

  it('golden example: sigma+=0.75, sigma-=0.475, gap=0.275 -> BUY', () => {
    const bullish = thesisState('bullish', { gamma: 0.5, rho: 0 }, true);
    const bearish = thesisState('bearish', { gamma: 0, rho: 0.05 }, true);

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('BUY');
    expect(decision.gap).toBeCloseTo(0.275, 9);
    expect(decision.thresholds).toEqual({ theta: 0.67, delta: 0.2 });
  });

  it('SELL when bearish dominates with sufficient score and gap', () => {
    const bullish = thesisState('bullish', { gamma: 0, rho: 0.05 }, true); // score = 0.475
    const bearish = thesisState('bearish', { gamma: 0.5, rho: 0 }, true); // score = 0.75

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('SELL');
    expect(decision.gap).toBeCloseTo(0.275, 9);
  });

  it('NO_RECOMMENDATION with reason NO_EVIDENCE when neither thesis has active supporters', () => {
    const bullish = thesisState('bullish', { gamma: 0, rho: 0 }, false);
    const bearish = thesisState('bearish', { gamma: 0, rho: 0 }, false);

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('NO_RECOMMENDATION');
    expect(decision.reason).toBe('NO_EVIDENCE');
  });

  it('NO_RECOMMENDATION with reason BELOW_ACTIVATION when sigma+=0.55 and no thesis reaches theta', () => {
    const bullish = thesisState('bullish', { gamma: 0.1, rho: 0 }, true); // score = 0.55
    const bearish = thesisState('bearish', { gamma: 0, rho: 0.5 }, false); // score = 0.25

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('NO_RECOMMENDATION');
    expect(decision.reason).toBe('BELOW_ACTIVATION');
  });

  it('NO_RECOMMENDATION with reason INSUFFICIENT_DOMINANCE when sigma+=0.70, sigma-=0.60, gap=0.10', () => {
    const bullish = thesisState('bullish', { gamma: 0.4, rho: 0 }, true); // score = 0.70
    const bearish = thesisState('bearish', { gamma: 0.2, rho: 0 }, true); // score = 0.60

    const decision = decide(bullish, bearish, ctx);

    expect(decision.recommendation).toBe('NO_RECOMMENDATION');
    expect(decision.reason).toBe('INSUFFICIENT_DOMINANCE');
    expect(decision.gap).toBeCloseTo(0.1, 9);
  });
});

describe('trace payload (full pass-through, PR1 self-containment)', () => {
  it('decision.trace.evidences/candles/turtle are exactly the DecisionContext values passed to decide()', () => {
    const bullish = thesisState('bullish', { gamma: 0.5, rho: 0 }, true);
    const bearish = thesisState('bearish', { gamma: 0, rho: 0.05 }, true);

    const traceCandles: Candle[] = [
      { openTime: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100.5, volume: 10 },
    ];
    const traceTurtle = '@prefix faf: <http://faf.example/ontology#> .\nfaf:event_BTCUSDT_price_1700000000000 a faf:PriceEvent .\n';
    const traceEvidences: Evidence[] = [dummyEvidence];

    const nonTrivialCtx = {
      asset: 'BTCUSDT',
      t: 1_700_000_000_000,
      candles: traceCandles,
      turtle: traceTurtle,
      evidences: traceEvidences,
    };

    const decision = decide(bullish, bearish, nonTrivialCtx);

    expect(decision.trace.evidences).toBe(traceEvidences);
    expect(decision.trace.candles).toBe(traceCandles);
    expect(decision.trace.turtle).toBe(traceTurtle);
  });
});
