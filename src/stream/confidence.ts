/**
 * L2 evidence confidence (gamma) formulas — FAF paper Cuadro 2, §3.3 p.7-8.
 * One function per evidence predicate. All formulas are only meaningful
 * (and only ever invoked by src/stream/evidence.ts) once the underlying
 * activation condition already holds (e.g. RSI<30 before
 * confidenceRsiBullish is called), so gamma is naturally within [0,1] in
 * normal operation; the explicit `min(...,1)` clamps mirror the paper's own
 * Cuadro 2 formulas.
 */

function clampUpper1(value: number): number {
  return Math.min(value, 1);
}

/** rsi_bullish: (30 - RSI) / 30. */
export function confidenceRsiBullish(rsi: number): number {
  return (30 - rsi) / 30;
}

/** rsi_bearish: (RSI - 70) / 30. */
export function confidenceRsiBearish(rsi: number): number {
  return (rsi - 70) / 30;
}

/** macd_bullish: min(H / sigma_H, 1); guarded against sigma_H = 0. */
export function confidenceMacdBullish(histogram: number, sigmaH: number): number {
  if (sigmaH === 0) return 0;
  return clampUpper1(histogram / sigmaH);
}

/** macd_bearish: min(|H| / sigma_H, 1); guarded against sigma_H = 0. */
export function confidenceMacdBearish(histogram: number, sigmaH: number): number {
  if (sigmaH === 0) return 0;
  return clampUpper1(Math.abs(histogram) / sigmaH);
}

/** sma_bullish: min((SMA20 - SMA50) / SMA50, 1); guarded against SMA50 = 0. */
export function confidenceSmaBullish(sma20: number, sma50: number): number {
  if (sma50 === 0) return 0;
  return clampUpper1((sma20 - sma50) / sma50);
}

/** sma_bearish: min((SMA50 - SMA20) / SMA50, 1); guarded against SMA50 = 0. */
export function confidenceSmaBearish(sma20: number, sma50: number): number {
  if (sma50 === 0) return 0;
  return clampUpper1((sma50 - sma20) / sma50);
}

/** bollinger_bullish: min((Linf - P) / (Lsup - Linf), 1); guarded against Lsup = Linf. */
export function confidenceBollingerBullish(price: number, lower: number, upper: number): number {
  const range = upper - lower;
  if (range === 0) return 0;
  return clampUpper1((lower - price) / range);
}

/** bollinger_bearish: min((P - Lsup) / (Lsup - Linf), 1); guarded against Lsup = Linf. */
export function confidenceBollingerBearish(price: number, lower: number, upper: number): number {
  const range = upper - lower;
  if (range === 0) return 0;
  return clampUpper1((price - upper) / range);
}
