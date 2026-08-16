import { describe, expect, it } from 'vitest';
import { runCycle } from '@/src/cycle/runCycle';
import candles from '../fixtures/paper-example/candles.json';
import type { Candle } from '@/src/domain/types';

// Golden #1 (design.md "Testing Strategy"): full runCycle end-to-end proof
// that the paper's §3 controlled example is reproduced from REAL OHLCV data
// pushed through every real layer (L1 mapCandles -> L2 window/extractEvidence
// -> L3 evaluateGraph -> L4 decide), not just the L3/L4 algebra in isolation
// (that isolation is Golden #2, tests/golden/algebra-only.test.ts).
//
// Fixture derivation, including the necessary post-D5 deviation (MACD and
// SMA now share sigma_omega since both windows are omega=50 — see
// design.md's Deviation D5 addendum) and post-D6 (RSI's window widened to
// its own independent omega=20, genuinely Wilder-smoothed — see design.md's
// Deviation D6), is fully documented in tests/fixtures/paper-example/README.md.
// D6 did NOT require changing any assertion below: RSI's own rho=0.40 target
// remains independently achievable, so the paper's exact original
// sigma-=0.475/gap=0.275 numbers are reproduced unchanged.

describe('Golden #1 — runCycle end-to-end over the paper-example fixture', () => {
  it('reproduces lambda*(mu+)=<0.50,0.00>, sigma+=0.75, sigma-=0.475, gap=0.275 -> BUY (tol 1e-9)', () => {
    const report = runCycle([{ asset: 'BTCUSDT', candles: candles as Candle[] }]);

    expect(report.decisions).toHaveLength(1);
    const decision = report.decisions[0]!;

    expect(decision.asset).toBe('BTCUSDT');
    expect(decision.recommendation).toBe('BUY');

    expect(decision.bullish.net.gamma).toBeCloseTo(0.5, 9);
    expect(decision.bullish.net.rho).toBeCloseTo(0, 9);

    const sigmaPlus = 0.5 * decision.bullish.net.gamma + 0.5 * (1 - decision.bullish.net.rho);
    const sigmaMinus = 0.5 * decision.bearish.net.gamma + 0.5 * (1 - decision.bearish.net.rho);
    expect(sigmaPlus).toBeCloseTo(0.75, 9);
    expect(sigmaMinus).toBeCloseTo(0.475, 9);
    expect(decision.gap).toBeCloseTo(0.275, 9);

    // Evidence set matches the paper's e1/e2/e3 (no bollinger evidence — price stays inside bands).
    const predicates = decision.trace.evidences.map((e) => e.predicate).sort();
    expect(predicates).toEqual(['macd_bullish', 'rsi_bullish', 'sma_bearish']);
  });

  it('is a pure function: recomputing from the same fixture yields a byte-identical decision', () => {
    const reportA = runCycle([{ asset: 'BTCUSDT', candles: candles as Candle[] }]);
    const reportB = runCycle([{ asset: 'BTCUSDT', candles: candles as Candle[] }]);

    expect(reportA.decisions[0]!.recommendation).toBe(reportB.decisions[0]!.recommendation);
    expect(reportA.decisions[0]!.gap).toBe(reportB.decisions[0]!.gap);
    expect(reportA.decisions[0]!.bullish.net).toEqual(reportB.decisions[0]!.bullish.net);
    expect(reportA.decisions[0]!.bearish.net).toEqual(reportB.decisions[0]!.bearish.net);
    expect(reportA.computedAt).toBe(reportB.computedAt);
    expect(reportA.cycleId).toBe(reportB.cycleId);
  });
});
