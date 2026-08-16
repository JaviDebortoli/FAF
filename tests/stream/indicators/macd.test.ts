import { describe, expect, it } from 'vitest';
import { computeMACD } from '@/src/stream/indicators/macd';

// FAF paper Cuadro 1 (MACD 26/1). Standard EMA definition (seed = SMA of
// the first `period` values, continuation EMA_i = value_i*k + EMA_{i-1}*(1-k),
// k=2/(period+1)); MACD line = EMA(fast) - EMA(slow); signal =
// EMA(signalPeriod) of the MACD line; histogram = MACD line - signal.
// Expected values hand-derived by direct step-by-step recomputation (see
// comments) — network access was unavailable to cross-check an external
// table, so each step is shown for independent re-verification.

describe('computeMACD (fast=3, slow=6, signalPeriod=2 — scaled down for tractable hand-verification)', () => {
  it('yields histogram=0 and sigmaH=0 for a strictly linear input (constant MACD line, guard case)', () => {
    // closes = [10..19]; EMA3 and EMA6 both track the linear trend with a
    // constant lag, so EMA3-EMA6 is constant (=1.5) across the whole
    // available MACD series -> stddev(sigmaH) = 0, and the 2-period signal
    // EMA of a constant series equals that same constant -> histogram = 0.
    const result = computeMACD([10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 3, 6, 2);
    expect(result.macdLine).toBeCloseTo(1.5, 9);
    expect(result.signal).toBeCloseTo(1.5, 9);
    expect(result.histogram).toBeCloseTo(0, 9);
    expect(result.sigmaH).toBeCloseTo(0, 9);
  });

  it('computes a non-trivial histogram=5/7 and sigmaH=6/7 when the trend breaks with a late jump', () => {
    // closes = [10,11,12,13,14,15,16,17,18,29] (same as above but the last
    // close jumps to 29). EMA3(last)=23, EMA6(last)=135.5/7 ->
    // MACD(last)=25.5/7. MACD series = [1.5,1.5,1.5,1.5,25.5/7].
    // signal (2-period EMA of that series) = 41/14; histogram =
    // 25.5/7 - 41/14 = 51/14 - 41/14 = 10/14 = 5/7.
    // sigmaH = population stddev of [1.5,1.5,1.5,1.5,51/14], mean=27/14,
    // variance = (4*(3/7)^2 + (12/7)^2)/5 = (36/49)/5*5... = 36/49 -> sigmaH=6/7.
    const result = computeMACD([10, 11, 12, 13, 14, 15, 16, 17, 18, 29], 3, 6, 2);
    expect(result.histogram).toBeCloseTo(5 / 7, 9);
    expect(result.sigmaH).toBeCloseTo(6 / 7, 9);
  });

  it('degrades gracefully to a single-point MACD series when closes.length exactly equals slowPeriod', () => {
    // Cuadro 1 fixes the MACD window at omega=26=defaultSlowPeriod, so at
    // FAF's actual runtime window size EMA(slow) only becomes available at
    // the very last candle -> the MACD-line series has exactly one point,
    // and histogram/sigmaH are always 0 (documented finding, see
    // apply-progress Deviations). This test locks that degenerate-but-safe
    // behavior instead of throwing.
    const closes = Array.from({ length: 26 }, (_, i) => 100 + i);
    const result = computeMACD(closes);
    expect(result.histogram).toBe(0);
    expect(result.sigmaH).toBe(0);
  });

  it('throws when fewer closes than slowPeriod are supplied', () => {
    expect(() => computeMACD([1, 2, 3], 3, 6, 2)).toThrow();
  });
});
