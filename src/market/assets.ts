/**
 * dynamic-asset-count: asset identity is decided solely by the shape of the
 * symbol pushed via `POST /api/cycle`, never by an enumerated list — see
 * openspec/changes/dynamic-asset-count/design.md "format predicate replaces
 * enumerated membership". No `/g` flag: `.test()` on a `/g` regex is
 * stateful across calls (RegExp.lastIndex advances), which would make
 * repeated validation of the same symbol silently alternate true/false.
 */
export const ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/;

export const BINANCE_KLINES_BASE_URL = 'https://api.binance.com/api/v3/klines';

export function isWellFormedAsset(asset: string): boolean {
  return ASSET_SYMBOL_PATTERN.test(asset);
}
