import { describe, expect, it } from 'vitest';
import { computeSMA } from '@/src/stream/indicators/sma';

// FAF paper Cuadro 1 (SMA cruce 20/50). Arithmetic mean over the trailing
// `period` closes — a closed-form identity, independently verifiable.

describe('computeSMA', () => {
  it('computes the arithmetic mean of all supplied closes when period === length', () => {
    expect(computeSMA([10, 20, 30], 3)).toBeCloseTo(20, 9);
  });

  it('computes the mean over the trailing `period` closes only (SMA20 vs SMA50 slicing)', () => {
    // last 3 of [10,20,30,40,50] = [30,40,50] -> mean 40
    expect(computeSMA([10, 20, 30, 40, 50], 3)).toBeCloseTo(40, 9);
  });

  it('throws when period exceeds the available closes (insufficient history)', () => {
    expect(() => computeSMA([10, 20], 5)).toThrow();
  });
});
