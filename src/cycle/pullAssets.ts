import { BinanceHttpSource } from '@/src/market/binance';
import type { AssetKlines } from './runCycle';

/**
 * TEMPORARY compatibility shim (dynamic-asset-count Phase 1): the old
 * `ASSET_ALLOWLIST` export was removed from `src/market/assets.ts` in this
 * change's Phase 1 (ingestion validation boundary), but this file's own
 * deletion is deferred to Phase 2a (task 2a.6), once its callers are
 * migrated to the push-only read path. This inlines the exact same 3-symbol
 * list `ASSET_ALLOWLIST` held, preserving identical behavior — zero
 * functional change — until Phase 2a deletes this file outright.
 */
const PULL_MODE_ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const;

/**
 * D-C pull-mode: server-side fetch for every allowlisted asset. Used by
 * `GET /api/decisions`'s cache-miss recompute path and the narrative
 * route's cache-miss fallback (both scheduled for removal in
 * dynamic-asset-count Phase 2a/2b, per the "push-only asset ingestion"
 * requirement) — required for the cache-hit / cache-miss-recompute equality
 * the design's D-B rationale depends on, until those phases land.
 */
export async function pullAllAssets(): Promise<AssetKlines[]> {
  const source = new BinanceHttpSource();
  return Promise.all(
    PULL_MODE_ASSETS.map(async (asset) => {
      const result = await source.fetchCandles(asset);
      return { asset, candles: result?.candles ?? [] };
    }),
  );
}
