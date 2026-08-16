import { describe, expect, it } from 'vitest';
import { computeReturns, computeSigmaOmega, computeRisk, SIGMA_REF } from '@/src/stream/risk';

// FAF paper eq. 1-2, §3.3 p.8 — returns, sigma_omega, and rho = min(sigma_omega/sigma_ref, 1).

describe('computeReturns (eq. 1: r_i = (P_i - P_i-1) / P_i-1)', () => {
  it('computes the percentage change between consecutive closes', () => {
    expect(computeReturns([100, 110])).toEqual([0.1]);
  });

  it('computes one return per consecutive pair for a longer series', () => {
    // 100 -> 101 -> 99.99: r1 = 1/100 = 0.01, r2 = (99.99-101)/101 = -0.01 (101*0.99=99.99 exactly)
    const returns = computeReturns([100, 101, 99.99]);
    expect(returns[0]).toBeCloseTo(0.01, 9);
    expect(returns[1]).toBeCloseTo(-0.01, 9);
  });

  it('returns an empty array for a single close (no pairs)', () => {
    expect(computeReturns([100])).toEqual([]);
  });
});

describe('computeSigmaOmega (population stddev of returns within the window)', () => {
  it('returns 0 when all consecutive closes are identical (zero-volatility guard)', () => {
    expect(computeSigmaOmega([100, 100, 100])).toBe(0);
  });

  it('computes the population stddev for the [100,101,99.99] fixture: mean=0, sigma=0.01', () => {
    // returns = [0.01, -0.01], mean = 0, variance = (0.0001+0.0001)/2 = 0.0001, sigma = 0.01
    expect(computeSigmaOmega([100, 101, 99.99])).toBeCloseTo(0.01, 9);
  });
});

describe('computeRisk (eq. 2: rho = min(sigma_omega / sigma_ref, 1), sigma_ref = 0.02)', () => {
  it('SIGMA_REF is fixed at 0.02 (paper eq. 2)', () => {
    expect(SIGMA_REF).toBe(0.02);
  });

  it('computes rho = 0.40 for sigma_omega = 0.008 (paper worked example)', () => {
    expect(computeRisk(0.008)).toBeCloseTo(0.4, 9);
  });

  it('computes rho = 0.5 for sigma_omega = 0.01', () => {
    expect(computeRisk(0.01)).toBeCloseTo(0.5, 9);
  });

  it('clamps rho at 1 when sigma_omega exceeds sigma_ref', () => {
    expect(computeRisk(0.05)).toBe(1);
  });

  it('returns 0 without dividing by zero when sigma_omega is 0 (edge-case guard)', () => {
    expect(computeRisk(0)).toBe(0);
  });
});
