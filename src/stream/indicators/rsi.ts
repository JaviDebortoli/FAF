/**
 * Wilder RSI (FAF paper Cuadro 1: RSI(14), window 14 candles / step 1).
 * Reference: J. Welles Wilder Jr., "New Concepts in Technical Trading
 * Systems" (1978) — smoothing method: seed = simple average of the first
 * `period` gains/losses, then continuation
 * avg_i = (avg_{i-1}*(period-1) + value_i) / period.
 *
 * FAF's zero-persisted-state architecture (design.md: every cycle rebuilds
 * from scratch, no cross-cycle state carried) means each call only has the
 * current window's closes available — there is no prior-cycle average to
 * continue smoothing from. `period` therefore defaults to
 * `closes.length - 1` so every diff in the supplied window feeds the SEED
 * step (see apply-progress Deviations for the Cuadro-1 omega=14
 * implication). An explicit `period` parameter is still accepted, and
 * exercised by the continuation-smoothing test above, to prove the general
 * Wilder formula is correct independent of how window.ts happens to invoke
 * it today.
 */
export function computeRSI(closes: number[], period?: number): number {
  if (closes.length < 2) {
    throw new Error('computeRSI requires at least 2 closes');
  }

  const diffs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    diffs.push(closes[i]! - closes[i - 1]!);
  }

  const p = period ?? diffs.length;
  if (p < 1 || p > diffs.length) {
    throw new Error(`computeRSI: period ${p} out of range for ${diffs.length} diffs`);
  }

  const gains = diffs.map((d) => Math.max(d, 0));
  const losses = diffs.map((d) => Math.max(-d, 0));

  let avgGain = gains.slice(0, p).reduce((a, b) => a + b, 0) / p;
  let avgLoss = losses.slice(0, p).reduce((a, b) => a + b, 0) / p;

  for (let i = p; i < diffs.length; i++) {
    avgGain = (avgGain * (p - 1) + gains[i]!) / p;
    avgLoss = (avgLoss * (p - 1) + losses[i]!) / p;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
