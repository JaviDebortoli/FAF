/**
 * Simple Moving Average (FAF paper Cuadro 1: SMA cruce 20/50, window 50
 * candles / step 1). `period` selects SMA20 or SMA50 from the shared
 * 50-candle window (design.md: "SMA50 window spans ~50h history").
 */
export function computeSMA(closes: number[], period: number): number {
  if (period < 1 || period > closes.length) {
    throw new Error(`computeSMA: period ${period} out of range for ${closes.length} closes`);
  }
  const windowCloses = closes.slice(-period);
  return windowCloses.reduce((a, b) => a + b, 0) / period;
}
