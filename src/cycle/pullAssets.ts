import { BinanceHttpSource } from '@/src/market/binance';
import type { AssetKlines } from './runCycle';

/**
 * TEMPORARY compatibility shim (dynamic-asset-count Phase 1, updated in
 * Phase 2a): the old `ASSET_ALLOWLIST` export was removed from
 * `src/market/assets.ts` in Phase 1 (ingestion validation boundary). Phase
 * 2a (this PR) migrated `GET /api/decisions` off this module entirely
 * (`app/api/decisions/route.ts` is now a pure cache read — see
 * `tests/api/pushOnly.test.ts`'s structural guard), which was originally
 * expected to leave this file with zero callers. It did not: the narrative
 * route (`app/api/decisions/[asset]/narrative/route.ts`) also calls
 * `pullAllAssets()` from its own cache-miss fallback (`getDecisionForAsset`)
 * and is NOT in Phase 2a's scope. This file's deletion is therefore
 * deferred to Phase 2b (task 2b.2), which deletes `getDecisionForAsset` —
 * its last remaining caller. Until then this inlines the exact same
 * 3-symbol list `ASSET_ALLOWLIST` held, preserving identical behavior —
 * zero functional change.
 */
const PULL_MODE_ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const;

/**
 * D-C pull-mode: server-side fetch for every allowlisted asset. As of
 * Phase 2a, used only by the narrative route's cache-miss fallback
 * (scheduled for removal in dynamic-asset-count Phase 2b, per the
 * "push-only asset ingestion" requirement) — `GET /api/decisions` no longer
 * calls this.
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
