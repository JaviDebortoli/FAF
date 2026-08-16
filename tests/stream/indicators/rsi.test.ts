import { describe, expect, it } from 'vitest';
import { computeRSI } from '@/src/stream/indicators/rsi';

// FAF paper Cuadro 1 (RSI 14/1). Algorithm: Wilder (1978), "New Concepts in
// Technical Trading Systems" — seed = simple average of the first `period`
// gains/losses, continuation avg_i = (avg_{i-1}*(period-1)+value_i)/period.
// Expected values below are hand-derived by direct step-by-step
// recomputation of the algorithm (shown in comments) rather than an
// external table, since network access was unavailable during
// implementation — each derivation is independently re-traceable.

describe('computeRSI — Wilder smoothing (paper Cuadro 1: RSI 14/1)', () => {
  it('returns 100 for a strictly increasing series (all gains, avgLoss=0 guard)', () => {
    expect(computeRSI([10, 11, 12, 13, 14])).toBe(100);
  });

  it('returns 0 for a strictly decreasing series (all losses)', () => {
    expect(computeRSI([14, 13, 12, 11, 10])).toBe(0);
  });

  it('computes RSI=100/3 for a small mixed case [10,11,9] (default period = diffs.length = 2)', () => {
    // diffs = [+1,-2] -> gains=[1,0], losses=[0,2]
    // avgGain=(1+0)/2=0.5, avgLoss=(0+2)/2=1, RS=0.5, RSI=100-100/1.5=100/3
    expect(computeRSI([10, 11, 9])).toBeCloseTo(100 / 3, 9);
  });

  it('exercises Wilder continuation smoothing beyond the seed (period=4 over 7 diffs)', () => {
    // closes=[10,12,11,14,13,16,15,18] -> diffs=[2,-1,3,-1,3,-1,3]
    // gains=[2,0,3,0,3,0,3], losses=[0,1,0,1,0,1,0]
    // seed (first 4): avgGain=(2+0+3+0)/4=1.25, avgLoss=(0+1+0+1)/4=0.5
    // continuation i=4 (gain=3,loss=0): avgGain=(1.25*3+3)/4=1.6875, avgLoss=(0.5*3+0)/4=0.375
    // continuation i=5 (gain=0,loss=1): avgGain=(1.6875*3+0)/4=1.265625, avgLoss=(0.375*3+1)/4=0.53125
    // continuation i=6 (gain=3,loss=0): avgGain=(1.265625*3+3)/4=1.69921875, avgLoss=(0.53125*3+0)/4=0.3984375
    // RS = 1.69921875/0.3984375 = 145/34, RSI = 100*RS/(1+RS) = 100*145/179 = 14500/179
    const rsi = computeRSI([10, 12, 11, 14, 13, 16, 15, 18], 4);
    expect(rsi).toBeCloseTo(14500 / 179, 9);
  });

  it('throws when fewer than 2 closes are supplied', () => {
    expect(() => computeRSI([10])).toThrow();
  });

  it('throws when the explicit period is out of range for the available diffs', () => {
    expect(() => computeRSI([10, 11, 12], 5)).toThrow();
  });
});
