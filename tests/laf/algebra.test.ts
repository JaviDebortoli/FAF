import { describe, expect, it } from 'vitest';
import { otimes, oplus, ominus } from '@/src/laf/algebra';
import type { Label } from '@/src/domain/types';

// FAF paper eq. 4-6 — label algebra: otimes (support), oplus (aggregation), ominus (conflict).

describe('otimes (support operator, eq. 4)', () => {
  it('is transparent w.r.t. the fixed rule label <1,0>: label ⊗ <1,0> === label', () => {
    const evidenceLabel: Label = { gamma: 0.5, rho: 0.4 };
    const ruleLabel: Label = { gamma: 1, rho: 0 };

    const result = otimes(evidenceLabel, ruleLabel);

    expect(result).toEqual({ gamma: 0.5, rho: 0.4 });
  });

  it('computes <min(gamma_e,gamma_r), max(rho_e,rho_r)> for a non-trivial rule label', () => {
    const a: Label = { gamma: 0.8, rho: 0.1 };
    const b: Label = { gamma: 0.3, rho: 0.6 };

    const result = otimes(a, b);

    expect(result).toEqual({ gamma: 0.3, rho: 0.6 });
  });
});

describe('oplus (aggregation operator, eq. 5/7)', () => {
  it('returns <0,0> for an empty supporter set', () => {
    const result = oplus([]);

    expect(result).toEqual({ gamma: 0, rho: 0 });
  });

  it('computes the unweighted arithmetic mean over active supporters (paper eq. 7)', () => {
    const a1: Label = { gamma: 0.5, rho: 0.4 };
    const a2: Label = { gamma: 0.8, rho: 0.1 };

    const result = oplus([a1, a2]);

    expect(result.gamma).toBeCloseTo(0.65, 9);
    expect(result.rho).toBeCloseTo(0.25, 9);
  });
});

describe('ominus (conflict operator, eq. 6)', () => {
  it('clamps both components at 0 — a thesis can never invert sign', () => {
    const smaller: Label = { gamma: 0.15, rho: 0.3 };
    const larger: Label = { gamma: 0.65, rho: 0.25 };

    const result = ominus(smaller, larger);

    expect(result.gamma).toBeCloseTo(0, 9);
    expect(result.rho).toBeCloseTo(0.05, 9);
  });

  it('computes <max(0,gamma_a-gamma_b), max(0,rho_a-rho_b)> (paper eq. 8-9 golden values)', () => {
    const muPlus: Label = { gamma: 0.65, rho: 0.25 };
    const muMinus: Label = { gamma: 0.15, rho: 0.3 };

    const netPlus = ominus(muPlus, muMinus);
    const netMinus = ominus(muMinus, muPlus);

    expect(netPlus.gamma).toBeCloseTo(0.5, 9);
    expect(netPlus.rho).toBeCloseTo(0, 9);
    expect(netMinus.gamma).toBeCloseTo(0, 9);
    expect(netMinus.rho).toBeCloseTo(0.05, 9);
  });
});
