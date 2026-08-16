import { describe, expect, it } from 'vitest';
import { computeScores } from '@/app/(dashboard)/lib/scores';
import { score } from '@/src/decision/policy';
import type { Argument, Decision, Evidence, Label, ThesisState } from '@/src/domain/types';

// design.md "Correctness trap — σ MUST be recomputed, never read": computeScores
// must derive sigma+/sigma- from decision.bullish.net/decision.bearish.net via
// the canonical score() (src/decision/policy.ts), NEVER from ThesisState.score
// (which src/domain/types.ts documents as non-authoritative, must never be
// read by L4 or presentation code).

const dummyEvidence: Evidence = {
  predicate: 'rsi_bullish',
  label: { gamma: 0.5, rho: 0.4 },
  t: 1_700_000_000_000,
  asset: 'BTCUSDT',
  window: { indicator: 'RSI', omega: 20, beta: 1 },
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

// staleScore deliberately does NOT match score(net) — this is the trap: a
// computeScores implementation that reads `.score` instead of recomputing
// from `.net` would return this wrong, stale value.
function thesisState(thesis: 'bullish' | 'bearish', net: Label, staleScore: number): ThesisState {
  return {
    thesis,
    supporters: [dummyArgument],
    aggregated: net,
    net,
    score: staleScore,
  };
}

function decisionFixture(bullish: ThesisState, bearish: ThesisState): Decision {
  return {
    asset: 'BTCUSDT',
    t: 1_700_000_000_000,
    recommendation: 'BUY',
    bullish,
    bearish,
    gap: 0,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [] },
  };
}

describe('computeScores', () => {
  it('recomputes sigma+/sigma- from bullish.net/bearish.net via canonical score(), never the stale .score field', () => {
    const bullishNet: Label = { gamma: 0.5, rho: 0 }; // score(net) = 0.75
    const bearishNet: Label = { gamma: 0, rho: 0.05 }; // score(net) = 0.475
    const bullish = thesisState('bullish', bullishNet, 999); // stale .score is a trap value
    const bearish = thesisState('bearish', bearishNet, -999); // stale .score is a trap value
    const decision = decisionFixture(bullish, bearish);

    const result = computeScores(decision);

    expect(result.sigmaPlus).toBeCloseTo(score(bullishNet), 9);
    expect(result.sigmaMinus).toBeCloseTo(score(bearishNet), 9);
    expect(result.sigmaPlus).toBeCloseTo(0.75, 9);
    expect(result.sigmaMinus).toBeCloseTo(0.475, 9);
    // Prove neither stale trap value leaked through.
    expect(result.sigmaPlus).not.toBe(999);
    expect(result.sigmaMinus).not.toBe(-999);
  });

  it('reads theta/delta from decision.thresholds, never a UI literal', () => {
    const bullish = thesisState('bullish', { gamma: 0.2, rho: 0.6 }, 0);
    const bearish = thesisState('bearish', { gamma: 0.1, rho: 0.9 }, 0);
    const decision = decisionFixture(bullish, bearish);
    decision.thresholds = { theta: 0.67, delta: 0.2 };

    const result = computeScores(decision);

    expect(result.theta).toBe(0.67);
    expect(result.delta).toBe(0.2);
  });

  it('computes gap as the absolute distance between sigma+ and sigma-', () => {
    const bullish = thesisState('bullish', { gamma: 0.5, rho: 0 }, 0); // score = 0.75
    const bearish = thesisState('bearish', { gamma: 0, rho: 0.05 }, 0); // score = 0.475
    const decision = decisionFixture(bullish, bearish);

    const result = computeScores(decision);

    expect(result.gap).toBeCloseTo(0.275, 9);
  });
});
