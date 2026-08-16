import type { Label } from '@/src/domain/types';

/**
 * L3 label algebra (FAF paper eq. 4-6).
 * lambda = <gamma, rho>, gamma = confidence, rho = risk, both in [0,1].
 */

/**
 * Support operator ⊗ (paper eq. 4): lambda(a_k) = lambda(e_k) ⊗ lambda(R_i)
 *   = <min(gamma_e, gamma_r), max(rho_e, rho_r)>.
 * Because every rule label is fixed at <1,0>, this is transparent:
 * otimes(evidenceLabel, <1,0>) === evidenceLabel.
 */
export function otimes(a: Label, b: Label): Label {
  return {
    gamma: Math.min(a.gamma, b.gamma),
    rho: Math.max(a.rho, b.rho),
  };
}

/**
 * Aggregation operator ⊕ (paper eq. 5/7): unweighted arithmetic mean over
 * active supporters. Empty supporter set -> <0,0>.
 *
 * Note on <0,0>'s status: this is the domain's natural "no evidence" base
 * case (it matches the decision policy's NO_EVIDENCE semantics), not a claim
 * that FAF's concrete mean-based oplus satisfies Budán's abstract algebraic
 * neutral-element property (general LAF paper, Definition 4). That property
 * strictly applies to Budán's own additive/t-conorm accrual operator, under
 * which appending a <0,0> element to a non-empty set leaves the aggregate
 * unchanged; under an unweighted mean it would not (it would pull the mean
 * toward zero). This function only special-cases the fully-empty list, so it
 * never relies on or claims that strict compositional neutrality.
 */
export function oplus(labels: Label[]): Label {
  if (labels.length === 0) {
    return { gamma: 0, rho: 0 };
  }

  const sum = labels.reduce(
    (acc, label) => ({ gamma: acc.gamma + label.gamma, rho: acc.rho + label.rho }),
    { gamma: 0, rho: 0 },
  );

  return {
    gamma: sum.gamma / labels.length,
    rho: sum.rho / labels.length,
  };
}

/**
 * Conflict operator ⊖ (paper eq. 6): lambda*(mu) = lambda(mu) ⊖ lambda(mu_opposite)
 *   = <max(0, gamma_a - gamma_b), max(0, rho_a - rho_b)>.
 * Clamped at 0 in both components — a thesis can never invert sign.
 */
export function ominus(a: Label, b: Label): Label {
  return {
    gamma: Math.max(0, a.gamma - b.gamma),
    rho: Math.max(0, a.rho - b.rho),
  };
}
