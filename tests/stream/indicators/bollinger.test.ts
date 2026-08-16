import { describe, expect, it } from 'vitest';
import { computeBollingerBands } from '@/src/stream/indicators/bollinger';

// FAF paper Cuadro 1 (Bollinger 20). Bands = SMA(period) +- 2*populationStdDev(period)
// (John Bollinger, "Bollinger on Bollinger Bands"). Expected values use the
// closed-form discrete-uniform-distribution identity variance({1..n}) =
// (n^2-1)/12 — a provable mathematical identity, not a fabricated number.

describe('computeBollingerBands', () => {
  it('computes middle/upper/lower for closes 1..20 via the discrete-uniform variance identity', () => {
    const closes = Array.from({ length: 20 }, (_, i) => i + 1); // 1..20
    const result = computeBollingerBands(closes, 20, 2);

    const expectedMean = 10.5; // (1+20)/2
    const expectedStdDev = Math.sqrt((20 ** 2 - 1) / 12); // population variance of {1..n} = (n^2-1)/12

    expect(result.middle).toBeCloseTo(expectedMean, 9);
    expect(result.upper).toBeCloseTo(expectedMean + 2 * expectedStdDev, 9);
    expect(result.lower).toBeCloseTo(expectedMean - 2 * expectedStdDev, 9);
  });

  it('collapses upper===lower===middle when all closes are identical (Lsup=Linf guard fixture)', () => {
    const closes = Array.from({ length: 20 }, () => 50);
    const result = computeBollingerBands(closes, 20, 2);

    expect(result.middle).toBe(50);
    expect(result.upper).toBe(50);
    expect(result.lower).toBe(50);
  });

  it('throws when period exceeds the available closes', () => {
    expect(() => computeBollingerBands([1, 2, 3], 20, 2)).toThrow();
  });
});
