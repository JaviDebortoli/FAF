import { describe, expect, it } from 'vitest';
import { ASSET_SYMBOL_PATTERN, BINANCE_KLINES_BASE_URL, isWellFormedAsset } from '@/src/market/assets';

// dynamic-asset-count: asset identity is decided by format alone, not an
// enumerated list. isWellFormedAsset is the sole gate — this is the
// exhaustive truth table for it (design.md Testing Strategy).

describe('assets', () => {
  it('exposes the Binance klines base URL', () => {
    expect(BINANCE_KLINES_BASE_URL).toBe('https://api.binance.com/api/v3/klines');
  });

  it('isWellFormedAsset accepts the previously-hardcoded v1 symbols', () => {
    expect(isWellFormedAsset('BTCUSDT')).toBe(true);
    expect(isWellFormedAsset('ETHUSDT')).toBe(true);
    expect(isWellFormedAsset('SOLUSDT')).toBe(true);
  });

  it('isWellFormedAsset accepts previously-unseen well-formed symbols (no enumerated list gates it)', () => {
    expect(isWellFormedAsset('ADAUSDT')).toBe(true);
    expect(isWellFormedAsset('1000PEPEUSDT')).toBe(true);
  });

  it('isWellFormedAsset rejects a lowercase-with-dash symbol', () => {
    expect(isWellFormedAsset('eth-usdt')).toBe(false);
  });

  it('isWellFormedAsset rejects an all-lowercase symbol', () => {
    expect(isWellFormedAsset('btcusdt')).toBe(false);
  });

  it('isWellFormedAsset rejects a symbol that is not USDT-suffixed', () => {
    expect(isWellFormedAsset('BTCUSD')).toBe(false);
  });

  it('isWellFormedAsset rejects a symbol with no prefix before USDT (too short)', () => {
    expect(isWellFormedAsset('USDT')).toBe(false);
  });

  it('isWellFormedAsset rejects an empty string', () => {
    expect(isWellFormedAsset('')).toBe(false);
  });

  it('isWellFormedAsset rejects a symbol whose prefix exceeds 20 characters', () => {
    const oversizedPrefix = 'A'.repeat(21);
    expect(isWellFormedAsset(`${oversizedPrefix}USDT`)).toBe(false);
  });

  it('module exports no enumerated-allowlist concept (ASSET_ALLOWLIST/isAllowedAsset/AllowedAsset removed)', async () => {
    const mod: Record<string, unknown> = await import('@/src/market/assets');
    expect(mod.ASSET_ALLOWLIST).toBeUndefined();
    expect(mod.isAllowedAsset).toBeUndefined();
  });

  it('ASSET_SYMBOL_PATTERN carries no /g flag (stateful .test() across repeated calls would be a gotcha)', () => {
    expect(ASSET_SYMBOL_PATTERN.flags).not.toContain('g');
  });

  it('repeated .test() calls on the same input stay stable (proves the pattern is not stateful)', () => {
    expect(ASSET_SYMBOL_PATTERN.test('BTCUSDT')).toBe(true);
    expect(ASSET_SYMBOL_PATTERN.test('BTCUSDT')).toBe(true);
    expect(ASSET_SYMBOL_PATTERN.test('BTCUSDT')).toBe(true);
  });
});
