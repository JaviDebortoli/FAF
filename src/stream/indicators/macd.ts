/**
 * MACD (FAF paper Cuadro 1: MACD(12/26/9), window 26 candles / step 1).
 * Standard definition: MACD line = EMA(fast) - EMA(slow); signal =
 * EMA(signalPeriod) of the MACD line; histogram = MACD line - signal.
 * EMA seeding: EMA_1 = SMA of the first `period` values, then
 * EMA_i = value_i*k + EMA_{i-1}*(1-k), k = 2/(period+1) — the standard
 * technical-analysis convention.
 *
 * sigma_H (paper §3.3 p.8: "la desviación estándar del histograma sigma_H
 * ... calculada sobre los valores disponibles en la ventana activa") is
 * the population standard deviation of the MACD-line series computed
 * within this call's window.
 *
 * RESOLVED by DEVIATION D5 (see design.md / docs/PRD.md "Desvíos
 * aprobados"): Cuadro 1's literal omega=26 exactly matches the default
 * slowPeriod, so a MACD-line series computed from a bare 26-candle window
 * degenerates to ONE point (EMA(slow) only becomes available at the very
 * last candle of a 26-candle window), making histogram and sigma_H always
 * 0 and the indicator permanently silent. The caller (`src/stream/
 * evidence.ts`'s `MACD_SPEC`) now supplies up to 50 closes — matching the
 * system's uniform per-cycle kline fetch — giving the EMA(26)/EMA(9) chain
 * enough history to converge to a non-degenerate, multi-point series. This
 * function's own `slowPeriod`/`fastPeriod`/`signalPeriod` parameters
 * (12/26/9, matching Cuadro 1's indicator formula) are UNCHANGED — only the
 * caller's window size changed. This function still implements the
 * general, multi-point-correct algorithm and degrades gracefully (rather
 * than throwing) for any window size >= slowPeriod.
 */

function computeEMASeries(values: number[], period: number): number[] {
  if (values.length < period) {
    throw new Error(`computeEMASeries: need at least ${period} values, got ${values.length}`);
  }

  const k = 2 / (period + 1);
  const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const series = [seed];
  for (let i = period; i < values.length; i++) {
    series.push(values[i]! * k + series[series.length - 1]! * (1 - k));
  }
  return series;
}

function populationStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export interface MACDResult {
  macdLine: number;
  signal: number;
  histogram: number;
  sigmaH: number;
}

export function computeMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  if (closes.length < slowPeriod) {
    throw new Error(`computeMACD requires at least ${slowPeriod} closes, got ${closes.length}`);
  }

  const emaFast = computeEMASeries(closes, fastPeriod);
  const emaSlow = computeEMASeries(closes, slowPeriod);
  const offset = slowPeriod - fastPeriod;
  const macdSeries = emaSlow.map((slowVal, i) => emaFast[offset + i]! - slowVal);

  const effectiveSignalPeriod = Math.min(signalPeriod, macdSeries.length);
  const signalSeries = computeEMASeries(macdSeries, effectiveSignalPeriod);

  const macdLine = macdSeries[macdSeries.length - 1]!;
  const signal = signalSeries[signalSeries.length - 1]!;
  const histogram = macdLine - signal;
  const sigmaH = populationStdDev(macdSeries);

  return { macdLine, signal, histogram, sigmaH };
}
