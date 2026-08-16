import type { Asset, Candle } from '@/src/domain/types';

/** Market-data fetch contract (semantic-ingestion spec, proposal D4): >= 50 candles/asset. */
export const MIN_CANDLES = 50;

export interface FetchResult {
  candles: Candle[];
  /** true iff candles.length >= MIN_CANDLES (cold start / insufficient-history flag). */
  sufficientHistory: boolean;
}

/**
 * MarketDataSource (design.md D-C: one ingestion route, two data sources —
 * PushedKlinesSource wraps n8n-forwarded raw klines; BinanceHttpSource
 * pulls server-side). `null` means "failed or delayed fetch": the caller
 * MUST emit nothing for that cycle, not an error (non-monotonic retraction,
 * FAF §2.1, semantic-ingestion spec).
 */
export interface MarketDataSource {
  fetchCandles(asset: Asset): Promise<FetchResult | null>;
}
