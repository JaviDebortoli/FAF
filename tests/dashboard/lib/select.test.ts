import { describe, expect, it } from 'vitest';
import { selectByDirection } from '@/app/(dashboard)/lib/select';
import type { Decision, DecisionReport, Recommendation, ThesisState } from '@/src/domain/types';

// design.md "Rename + widen the selector": selectByDirection(report, direction) =
// direction === 'ALL' ? report.decisions : report.decisions.filter(d => d.recommendation === direction).
// No pre-filter step — NO_RECOMMENDATION decisions are included in 'ALL' and
// directly selectable, matching the D1 reversal (no-recommendation-filter-and-i18n).

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

describe('selectByDirection', () => {
  it('ALL returns every decision, including NO_RECOMMENDATION — no pre-filter', () => {
    const report = reportFixture([
      decisionFixture('BTCUSDT', 'BUY'),
      decisionFixture('ETHUSDT', 'NO_RECOMMENDATION'),
      decisionFixture('SOLUSDT', 'SELL'),
    ]);

    const result = selectByDirection(report, 'ALL');

    expect(result.map((d) => d.asset)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
  });

  it('defaults to ALL when no direction argument is passed', () => {
    const report = reportFixture([
      decisionFixture('BTCUSDT', 'BUY'),
      decisionFixture('ETHUSDT', 'NO_RECOMMENDATION'),
    ]);

    const result = selectByDirection(report);

    expect(result.map((d) => d.asset)).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  it('returns an empty array when the report has zero decisions', () => {
    const report = reportFixture([]);

    const result = selectByDirection(report, 'ALL');

    expect(result).toEqual([]);
  });

  describe.each<{ direction: 'ALL' | 'BUY' | 'SELL' | 'NO_RECOMMENDATION'; expected: string[] }>([
    { direction: 'ALL', expected: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] },
    { direction: 'BUY', expected: ['BTCUSDT'] },
    { direction: 'SELL', expected: ['SOLUSDT'] },
    { direction: 'NO_RECOMMENDATION', expected: ['ETHUSDT'] },
  ])('direction filter = $direction', ({ direction, expected }) => {
    it(`narrows to ${JSON.stringify(expected)}`, () => {
      const report = reportFixture([
        decisionFixture('BTCUSDT', 'BUY'),
        decisionFixture('ETHUSDT', 'NO_RECOMMENDATION'),
        decisionFixture('SOLUSDT', 'SELL'),
      ]);

      const result = selectByDirection(report, direction);

      expect(result.map((d) => d.asset)).toEqual(expected);
    });
  });

  it('NO_RECOMMENDATION filter over an all-actionable report returns empty', () => {
    const report = reportFixture([decisionFixture('BTCUSDT', 'BUY'), decisionFixture('ETHUSDT', 'SELL')]);

    const result = selectByDirection(report, 'NO_RECOMMENDATION');

    expect(result).toEqual([]);
  });
});
