import { describe, expect, it } from 'vitest';
import { selectActionable } from '@/app/(dashboard)/lib/select';
import type { Decision, DecisionReport, Recommendation, ThesisState } from '@/src/domain/types';

// design.md "Tier 1 selection rule": selectActionable(report) =
// report.decisions.filter(d => d.recommendation !== 'NO_RECOMMENDATION'),
// then the direction filter (ALL|BUY|SELL) over that set.

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
    bullish: emptyThesis,
    bearish: emptyThesis,
    gap: 0,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [] },
  };
}

function reportFixture(decisions: Decision[]): DecisionReport {
  return { cycleId: 'cycle-1', computedAt: 1_700_000_000_000, decisions };
}

describe('selectActionable', () => {
  it('filters out NO_RECOMMENDATION decisions', () => {
    const report = reportFixture([
      decisionFixture('BTCUSDT', 'BUY'),
      decisionFixture('ETHUSDT', 'NO_RECOMMENDATION'),
      decisionFixture('SOLUSDT', 'SELL'),
    ]);

    const result = selectActionable(report);

    expect(result.map((d) => d.asset)).toEqual(['BTCUSDT', 'SOLUSDT']);
  });

  it('returns an empty array when every decision is NO_RECOMMENDATION', () => {
    const report = reportFixture([
      decisionFixture('BTCUSDT', 'NO_RECOMMENDATION'),
      decisionFixture('ETHUSDT', 'NO_RECOMMENDATION'),
    ]);

    const result = selectActionable(report);

    expect(result).toEqual([]);
  });

  describe.each<{ direction: 'ALL' | 'BUY' | 'SELL'; expected: string[] }>([
    { direction: 'ALL', expected: ['BTCUSDT', 'SOLUSDT'] },
    { direction: 'BUY', expected: ['BTCUSDT'] },
    { direction: 'SELL', expected: ['SOLUSDT'] },
  ])('direction filter = $direction', ({ direction, expected }) => {
    it(`narrows to ${JSON.stringify(expected)}`, () => {
      const report = reportFixture([
        decisionFixture('BTCUSDT', 'BUY'),
        decisionFixture('ETHUSDT', 'NO_RECOMMENDATION'),
        decisionFixture('SOLUSDT', 'SELL'),
      ]);

      const result = selectActionable(report, direction);

      expect(result.map((d) => d.asset)).toEqual(expected);
    });
  });

  it('BUY filter over an all-NO_RECOMMENDATION report returns empty (filter excluded everything)', () => {
    const report = reportFixture([
      decisionFixture('BTCUSDT', 'NO_RECOMMENDATION'),
      decisionFixture('ETHUSDT', 'NO_RECOMMENDATION'),
    ]);

    const result = selectActionable(report, 'BUY');

    expect(result).toEqual([]);
  });
});
