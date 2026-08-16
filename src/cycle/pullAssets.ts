import { ASSET_ALLOWLIST } from '@/src/market/assets';
import { BinanceHttpSource } from '@/src/market/binance';
import type { AssetKlines } from './runCycle';

/**
 * D-C pull-mode: server-side fetch for every allowlisted asset. Shared by
 * both route handlers (`POST /api/cycle`'s empty-body pull path and
 * `GET /api/decisions`'s cache-miss recompute path) so both go through the
 * exact same data-acquisition logic — required for the cache-hit /
 * cache-miss-recompute equality the design's D-B rationale depends on.
 */
export async function pullAllAssets(): Promise<AssetKlines[]> {
  const source = new BinanceHttpSource();
  return Promise.all(
    ASSET_ALLOWLIST.map(async (asset) => {
      const result = await source.fetchCandles(asset);
      return { asset, candles: result?.candles ?? [] };
    }),
  );
}
