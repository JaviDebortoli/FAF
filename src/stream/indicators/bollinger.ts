import { computeSMA } from './sma';

/**
 * Bollinger Bands (FAF paper Cuadro 1: Bollinger(20), window 20 candles /
 * step 1). Reference: John Bollinger, "Bollinger on Bollinger Bands" —
 * middle = SMA(period); bands = middle +- k * populationStdDev(period),
 * k=2 (paper §2.3).
 */
export interface BollingerBands {
  middle: number;
  upper: number;
  lower: number;
}

export function computeBollingerBands(closes: number[], period = 20, k = 2): BollingerBands {
  if (period < 1 || period > closes.length) {
    throw new Error(`computeBollingerBands: period ${period} out of range for ${closes.length} closes`);
  }

  const windowCloses = closes.slice(-period);
  const middle = computeSMA(windowCloses, period);
  const variance = windowCloses.reduce((acc, c) => acc + (c - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);

  return { middle, upper: middle + k * stdDev, lower: middle - k * stdDev };
}
