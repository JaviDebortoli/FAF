import { describe, expect, it } from 'vitest';
import { ASSET_ALLOWLIST, BINANCE_KLINES_BASE_URL, isAllowedAsset } from '@/src/market/assets';

// FAF v1 scope decision (design.md Open Questions, resolved by the user):
// asset allowlist = BTCUSDT, ETHUSDT, SOLUSDT. Purely structural constants
// (task 0.3) — triangulation limited to the allowlist membership predicate,
// which is the only branching logic in this module.

describe('assets', () => {
  it('fixes the v1 allowlist to exactly BTCUSDT, ETHUSDT, SOLUSDT', () => {
    expect(ASSET_ALLOWLIST).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
  });

  it('exposes the Binance klines base URL', () => {
    expect(BINANCE_KLINES_BASE_URL).toBe('https://api.binance.com/api/v3/klines');
  });

  it('isAllowedAsset accepts every allowlisted symbol', () => {
    expect(isAllowedAsset('BTCUSDT')).toBe(true);
    expect(isAllowedAsset('ETHUSDT')).toBe(true);
    expect(isAllowedAsset('SOLUSDT')).toBe(true);
  });

  it('isAllowedAsset rejects a symbol outside the allowlist (T-2 SSRF guard)', () => {
    expect(isAllowedAsset('DOGEUSDT')).toBe(false);
    expect(isAllowedAsset('')).toBe(false);
  });
});
