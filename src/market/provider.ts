import type { Asset, Candle } from '@/src/domain/types';

/** Market-data fetch contract (semantic-ingestion spec, proposal D4): >= 50 candles/asset. */
export const MIN_CANDLES = 50;

export interface FetchResult {
  candles: Candle[];
  /** true iff candles.length >= MIN_CANDLES (cold start / insufficient-history flag). */
  sufficientHistory: boolean;
}

/**
 * MarketDataSource. The `faf-platform` design.md "one ingestion route, two
 * data sources" decision this once documented is SUPERSEDED — see
 * openspec/changes/dynamic-asset-count/design.md "Supersession" section.
 * Ingestion is now push-only via `POST /api/cycle`; `BinanceHttpSource` is
 * retained only to satisfy the still-in-force "Market-data fetch contract"
 * requirement in `openspec/specs/semantic-ingestion/spec.md`. `null` means
 * "failed or delayed fetch": the caller MUST emit nothing for that cycle,
 * not an error (non-monotonic retraction, FAF §2.1, semantic-ingestion
 * spec).
 */
export interface MarketDataSource {
  fetchCandles(asset: Asset): Promise<FetchResult | null>;
}
