import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ArgumentGraph } from '@/app/(dashboard)/components/ArgumentGraph';
import { ThesisScores } from '@/app/(dashboard)/components/ThesisScores';
import type { Decision, Recommendation, ThesisState } from '@/src/domain/types';

/**
 * no-recommendation-filter-and-i18n Phase 1 (task 1.6) — D2 coercion-bug
 * regression test, covering both `ArgumentGraph.tsx` and `ThesisScores.tsx`
 * (identical `winningThesis` one-liner in each). Both used to derive the
 * leading thesis from `decision.recommendation === 'BUY'`, defaulting any
 * non-BUY recommendation (including NO_RECOMMENDATION) to bearish — wrong
 * whenever sigma+ actually led. The fix compares `sigmaPlus >= sigmaMinus`
 * directly (design.md), so this pins: (a) existing BUY/SELL fixtures agree
 * with the old ternary's result (regression), and (b) a NO_RECOMMENDATION
 * fixture with sigma+ > sigma- highlights bullish, not bearish-by-default.
 *
 * `ArgumentGraph`'s net nodes (NP/NN, `x: NET_X` = 660, per `graphLayout.ts`)
 * have no `data-testid`, so the winner is read off the rendered `fill`
 * attribute of the `cx="660"` circles, in `[NP, NN]` render order (fixed by
 * `layoutArgumentGraph`'s node array: leaves, AP, AN, CA, NP, NN).
 * `ThesisScores`'s two `ThesisColumn`s (Alcista=bullish, Bajista=bearish,
 * fixed JSX order) expose `data-active` directly, read in the same order.
 */

const emptyThesis: ThesisState = {
  thesis: 'bullish',
  supporters: [],
  aggregated: { gamma: 0, rho: 0 },
  net: { gamma: 0, rho: 0 },
  score: 0,
};

function decisionFixture(
  recommendation: Recommendation,
  bullishNet: { gamma: number; rho: number },
  bearishNet: { gamma: number; rho: number },
): Decision {
  return {
    asset: 'TESTUSDT',
    t: 1_700_000_000_000,
    recommendation,
    bullish: { ...emptyThesis, net: bullishNet },
    bearish: { ...emptyThesis, net: bearishNet },
    gap: 0,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [] },
  };
}

function netFills(html: string): [np: string, nn: string] {
  const [np, nn] = [...html.matchAll(/<circle cx="660"[^>]*?fill="([^"]+)"/g)].map((m) => m[1] ?? '');
  return [np ?? '', nn ?? ''];
}

function activeFlags(html: string): [bullish: string, bearish: string] {
  const [bullish, bearish] = [...html.matchAll(/data-active="(true|false)"/g)].map((m) => m[1] ?? '');
  return [bullish ?? '', bearish ?? ''];
}

describe('ArgumentGraph / ThesisScores — winningThesis derives from scores, not the recommendation label', () => {
  it('regression: BUY decision with sigma+ > sigma- highlights bullish (agrees with old ternary)', () => {
    const decision = decisionFixture('BUY', { gamma: 0.9, rho: 0.05 }, { gamma: 0.1, rho: 0.9 });

    const graphHtml = renderToString(ArgumentGraph({ decision }));
    const [npFill, nnFill] = netFills(graphHtml);
    expect(npFill).not.toBe('none');
    expect(nnFill).toBe('none');

    const scoresHtml = renderToString(ThesisScores({ decision }));
    const [bullishActive, bearishActive] = activeFlags(scoresHtml);
    expect(bullishActive).toBe('true');
    expect(bearishActive).toBe('false');
  });

  it('regression: SELL decision with sigma- > sigma+ highlights bearish (agrees with old ternary)', () => {
    const decision = decisionFixture('SELL', { gamma: 0.1, rho: 0.9 }, { gamma: 0.9, rho: 0.05 });

    const graphHtml = renderToString(ArgumentGraph({ decision }));
    const [npFill, nnFill] = netFills(graphHtml);
    expect(npFill).toBe('none');
    expect(nnFill).not.toBe('none');

    const scoresHtml = renderToString(ThesisScores({ decision }));
    const [bullishActive, bearishActive] = activeFlags(scoresHtml);
    expect(bullishActive).toBe('false');
    expect(bearishActive).toBe('true');
  });

  it('fix: NO_RECOMMENDATION decision with sigma+ > sigma- (both below theta) highlights bullish, not bearish-by-default', () => {
    // gamma=0.5,rho=0.2 -> sigma = 0.5*0.5 + 0.5*(1-0.2) = 0.65 (< theta 0.67)
    // gamma=0.1,rho=0.8 -> sigma = 0.5*0.1 + 0.5*(1-0.8) = 0.15
    const decision = decisionFixture('NO_RECOMMENDATION', { gamma: 0.5, rho: 0.2 }, { gamma: 0.1, rho: 0.8 });

    const graphHtml = renderToString(ArgumentGraph({ decision }));
    const [npFill, nnFill] = netFills(graphHtml);
    expect(npFill).not.toBe('none');
    expect(nnFill).toBe('none');

    const scoresHtml = renderToString(ThesisScores({ decision }));
    const [bullishActive, bearishActive] = activeFlags(scoresHtml);
    expect(bullishActive).toBe('true');
    expect(bearishActive).toBe('false');
  });
});
