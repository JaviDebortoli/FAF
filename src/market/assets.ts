/**
 * v1 asset allowlist (design.md Open Questions, resolved) and Binance
 * klines endpoint base URL. Consumed by BinanceHttpSource (T-2: URLs MUST
 * be built only from this allowlist, never from request input) and by
 * /api/cycle's payload validation (T-1, Phase 6).
 */
export const ASSET_ALLOWLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const;

export type AllowedAsset = (typeof ASSET_ALLOWLIST)[number];

export const BINANCE_KLINES_BASE_URL = 'https://api.binance.com/api/v3/klines';

export function isAllowedAsset(asset: string): asset is AllowedAsset {
  return (ASSET_ALLOWLIST as readonly string[]).includes(asset);
}
