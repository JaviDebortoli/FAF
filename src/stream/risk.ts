/**
 * L2 risk computation (FAF paper eq. 1-2, §3.3 p.8).
 * rho_k in [0,1] measures the fragility of an evidence: the population
 * standard deviation of consecutive-close returns within the active
 * window, normalized by a fixed saturation constant sigma_ref = 0.02.
 */

/** eq. 1: r_i = (P_i - P_i-1) / P_i-1, one return per consecutive close pair. */
export function computeReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const current = closes[i]!;
    const previous = closes[i - 1]!;
    returns.push((current - previous) / previous);
  }
  return returns;
}

/** Population standard deviation of the window's consecutive-close returns. */
export function computeSigmaOmega(closes: number[]): number {
  const returns = computeReturns(closes);
  if (returns.length === 0) return 0;

  const mean = returns.reduce((acc, r) => acc + r, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

/** Domain-saturation constant delimiting the extreme-volatility regime (paper eq. 2, §3.3 p.8). */
export const SIGMA_REF = 0.02;

/** eq. 2: rho = min(sigma_omega / sigma_ref, 1), guarded against sigma_omega = 0. */
export function computeRisk(sigmaOmega: number, sigmaRef: number = SIGMA_REF): number {
  if (sigmaOmega === 0) return 0;
  return Math.min(sigmaOmega / sigmaRef, 1);
}
