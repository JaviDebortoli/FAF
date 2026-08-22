import type { Market } from '@/src/domain/types';

/**
 * dynamic-asset-count: asset identity is decided solely by the shape of the
 * symbol pushed via `POST /api/cycle`, never by an enumerated list — see
 * openspec/changes/dynamic-asset-count/design.md "format predicate replaces
 * enumerated membership". No `/g` flag: `.test()` on a `/g` regex is
 * stateful across calls (RegExp.lastIndex advances), which would make
 * repeated validation of the same symbol silently alternate true/false.
 */
export const ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/;

/**
 * acciones-market-integration (design.md D-C): US ticker format — 1-5
 * uppercase letters with an optional single-letter share-class suffix
 * (e.g. `AAPL`, `BRK.B`). No `/g` flag, same rationale as
 * `ASSET_SYMBOL_PATTERN` above.
 */
export const ACCIONES_SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;

export const BINANCE_KLINES_BASE_URL = 'https://api.binance.com/api/v3/klines';

/**
 * Dispatches to the pattern for `market` (design.md D-C): `ASSET_SYMBOL_PATTERN`
 * for `crypto`, `ACCIONES_SYMBOL_PATTERN` for `acciones`. `market` is always a
 * validated `Market` literal at every call site (checked upstream by
 * `parseCyclePayload`), so no default/`else` branch is needed.
 */
export function isWellFormedAsset(market: Market, asset: string): boolean {
  return market === 'crypto' ? ASSET_SYMBOL_PATTERN.test(asset) : ACCIONES_SYMBOL_PATTERN.test(asset);
}
