import { describe, expect, it } from 'vitest';
import { ACCIONES_SYMBOL_PATTERN, ASSET_SYMBOL_PATTERN, BINANCE_KLINES_BASE_URL, isWellFormedAsset } from '@/src/market/assets';

// dynamic-asset-count: asset identity is decided by format alone, not an
// enumerated list. isWellFormedAsset is the sole gate — this is the
// exhaustive truth table for it (design.md Testing Strategy).
//
// acciones-market-integration (design.md D-C): isWellFormedAsset now takes
// a `market` discriminator as its first argument and dispatches to the
// pattern for that market (ASSET_SYMBOL_PATTERN for crypto,
// ACCIONES_SYMBOL_PATTERN for acciones).

describe('assets', () => {
  it('exposes the Binance klines base URL', () => {
    expect(BINANCE_KLINES_BASE_URL).toBe('https://api.binance.com/api/v3/klines');
  });

  it('isWellFormedAsset accepts the previously-hardcoded v1 symbols for market: crypto', () => {
    expect(isWellFormedAsset('crypto', 'BTCUSDT')).toBe(true);
    expect(isWellFormedAsset('crypto', 'ETHUSDT')).toBe(true);
    expect(isWellFormedAsset('crypto', 'SOLUSDT')).toBe(true);
  });

  it('isWellFormedAsset accepts previously-unseen well-formed crypto symbols (no enumerated list gates it)', () => {
    expect(isWellFormedAsset('crypto', 'ADAUSDT')).toBe(true);
    expect(isWellFormedAsset('crypto', '1000PEPEUSDT')).toBe(true);
  });

  it('isWellFormedAsset rejects a lowercase-with-dash crypto symbol', () => {
    expect(isWellFormedAsset('crypto', 'eth-usdt')).toBe(false);
  });

  it('isWellFormedAsset rejects an all-lowercase crypto symbol', () => {
    expect(isWellFormedAsset('crypto', 'btcusdt')).toBe(false);
  });

  it('isWellFormedAsset rejects a crypto symbol that is not USDT-suffixed', () => {
    expect(isWellFormedAsset('crypto', 'BTCUSD')).toBe(false);
  });

  it('isWellFormedAsset rejects a crypto symbol with no prefix before USDT (too short)', () => {
    expect(isWellFormedAsset('crypto', 'USDT')).toBe(false);
  });

  it('isWellFormedAsset rejects an empty crypto symbol', () => {
    expect(isWellFormedAsset('crypto', '')).toBe(false);
  });

  it('isWellFormedAsset rejects a crypto symbol whose prefix exceeds 20 characters', () => {
    const oversizedPrefix = 'A'.repeat(21);
    expect(isWellFormedAsset('crypto', `${oversizedPrefix}USDT`)).toBe(false);
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

  // acciones truth table (semantic-ingestion spec delta "POST /api/cycle
  // symbol validation contract" — market: 'acciones' scenarios).
  it('isWellFormedAsset accepts a well-formed 1-5 letter acciones ticker (AAPL)', () => {
    expect(isWellFormedAsset('acciones', 'AAPL')).toBe(true);
  });

  it('isWellFormedAsset accepts a well-formed acciones share-class ticker (BRK.B)', () => {
    expect(isWellFormedAsset('acciones', 'BRK.B')).toBe(true);
  });

  it('isWellFormedAsset rejects an empty acciones symbol', () => {
    expect(isWellFormedAsset('acciones', '')).toBe(false);
  });

  it('isWellFormedAsset rejects a lowercase acciones symbol (aapl)', () => {
    expect(isWellFormedAsset('acciones', 'aapl')).toBe(false);
  });

  it('isWellFormedAsset rejects an acciones symbol exceeding 5 letters (AAAAAA)', () => {
    expect(isWellFormedAsset('acciones', 'AAAAAA')).toBe(false);
  });

  it('isWellFormedAsset rejects an acciones symbol with digits (AAP1)', () => {
    expect(isWellFormedAsset('acciones', 'AAP1')).toBe(false);
  });

  it('isWellFormedAsset rejects an acciones symbol with a two-letter share-class suffix (BRK.BB)', () => {
    expect(isWellFormedAsset('acciones', 'BRK.BB')).toBe(false);
  });

  it('isWellFormedAsset rejects an acciones symbol with a dangling dot (BRK.)', () => {
    expect(isWellFormedAsset('acciones', 'BRK.')).toBe(false);
  });

  it('isWellFormedAsset rejects an acciones symbol with a digit share-class suffix (BRK.1)', () => {
    expect(isWellFormedAsset('acciones', 'BRK.1')).toBe(false);
  });

  it('ACCIONES_SYMBOL_PATTERN carries no /g flag (stateful .test() across repeated calls would be a gotcha)', () => {
    expect(ACCIONES_SYMBOL_PATTERN.flags).not.toContain('g');
  });

  it('a well-formed crypto symbol is rejected when validated against market: acciones, and vice versa', () => {
    expect(isWellFormedAsset('acciones', 'BTCUSDT')).toBe(false);
    expect(isWellFormedAsset('crypto', 'AAPL')).toBe(false);
  });
});
