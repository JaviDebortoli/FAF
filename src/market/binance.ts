import type { Asset, Candle } from '@/src/domain/types';
import { BINANCE_KLINES_BASE_URL, isAllowedAsset } from './assets';
import { MIN_CANDLES } from './provider';
import type { FetchResult, MarketDataSource } from './provider';

const KLINES_LIMIT = 50;
const KLINE_INTERVAL = '1h';

function parseKline(raw: unknown): Candle | null {
  if (!Array.isArray(raw) || raw.length < 6) return null;

  const [openTime, open, high, low, close, volume] = raw;
  const candle: Candle = {
    openTime: Number(openTime),
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  };

  if (Object.values(candle).some((v) => !Number.isFinite(v))) return null;
  return candle;
}

/**
 * Binance klines adapter (semantic-ingestion spec: no API key required).
 * T-2 (design.md Threat Matrix): the request URL is built ONLY from the
 * `src/market/assets.ts` allowlist — `asset` is checked with
 * `isAllowedAsset` before any network call, never interpolated from
 * unchecked request input.
 *
 * Failed/delayed fetch, malformed body, and rate-limit (429) all resolve to
 * `null` — "emit nothing for that cycle, no error" (FAF §2.1, non-monotonic
 * retraction), never a thrown exception.
 */
export class BinanceHttpSource implements MarketDataSource {
  async fetchCandles(asset: Asset): Promise<FetchResult | null> {
    if (!isAllowedAsset(asset)) {
      return null;
    }

    const url = `${BINANCE_KLINES_BASE_URL}?symbol=${asset}&interval=${KLINE_INTERVAL}&limit=${KLINES_LIMIT}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      return null; // network failure/timeout -> emit nothing, no error
    }

    if (!response.ok) {
      return null; // covers 429 rate-limit and any other non-2xx status
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return null; // malformed (non-JSON) response body
    }

    if (!Array.isArray(body)) {
      return null; // malformed (Binance error-object) response body
    }

    const candles = body.map(parseKline).filter((c): c is Candle => c !== null);
    return { candles, sufficientHistory: candles.length >= MIN_CANDLES };
  }
}
