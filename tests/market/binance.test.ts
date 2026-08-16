import { afterEach, describe, expect, it, vi } from 'vitest';
import { BinanceHttpSource } from '@/src/market/binance';
import { BINANCE_KLINES_BASE_URL } from '@/src/market/assets';
import klinesOk from '../fixtures/binance/klines-ok.json';
import klinesInsufficient from '../fixtures/binance/klines-insufficient.json';
import klinesEmpty from '../fixtures/binance/klines-empty.json';
import klinesMalformed from '../fixtures/binance/klines-malformed.json';
import klinesRateLimit from '../fixtures/binance/klines-rate-limit.json';
import klinesPartiallyMalformed from '../fixtures/binance/klines-partially-malformed.json';

// FAF semantic-ingestion spec — market-data fetch contract, tested over
// RECORDED CASSETTES (tests/fixtures/binance/*.json), no live network calls
// (design.md Testing Strategy: "No live network in CI").

function mockFetchOnce(impl: (url: string) => Promise<Response> | Response): void {
  vi.stubGlobal('fetch', vi.fn(impl));
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BinanceHttpSource.fetchCandles', () => {
  it('parses an OK cassette into >=50 candles with sufficientHistory=true (D4)', async () => {
    mockFetchOnce(() => jsonResponse(klinesOk));
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('BTCUSDT');

    expect(result).not.toBeNull();
    expect(result!.candles).toHaveLength(50);
    expect(result!.sufficientHistory).toBe(true);
    expect(result!.candles[0]).toEqual({
      openTime: 1_700_000_000_000,
      open: 100,
      high: 101,
      low: 99,
      close: 100.5,
      volume: 1000,
    });
  });

  it('flags insufficient history on a cold-start cassette (<50 candles)', async () => {
    mockFetchOnce(() => jsonResponse(klinesInsufficient));
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('BTCUSDT');

    expect(result).not.toBeNull();
    expect(result!.candles).toHaveLength(10);
    expect(result!.sufficientHistory).toBe(false);
  });

  it('returns an empty-but-non-null result for an empty klines cassette', async () => {
    mockFetchOnce(() => jsonResponse(klinesEmpty));
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('BTCUSDT');

    expect(result).toEqual({ candles: [], sufficientHistory: false });
  });

  it('returns null for a malformed (non-array) response body, no error thrown', async () => {
    mockFetchOnce(() => jsonResponse(klinesMalformed));
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('BTCUSDT');

    expect(result).toBeNull();
  });

  it('filters out malformed individual kline entries while keeping valid ones', async () => {
    mockFetchOnce(() => jsonResponse(klinesPartiallyMalformed));
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('BTCUSDT');

    expect(result).not.toBeNull();
    expect(result!.candles).toHaveLength(5); // 5 valid + 2 malformed dropped
    expect(result!.sufficientHistory).toBe(false);
  });

  it('returns null on a 429 rate-limit response, no error thrown (failed fetch -> emit nothing)', async () => {
    mockFetchOnce(() => jsonResponse(klinesRateLimit, { ok: false, status: 429 }));
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('BTCUSDT');

    expect(result).toBeNull();
  });

  it('returns null when the network call fails/times out, no error thrown (non-monotonic retraction)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network timeout'))),
    );
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('BTCUSDT');

    expect(result).toBeNull();
  });

  it('T-2: never calls fetch for an asset outside the allowlist', async () => {
    const fetchSpy = vi.fn(() => jsonResponse(klinesOk));
    vi.stubGlobal('fetch', fetchSpy);
    const source = new BinanceHttpSource();

    const result = await source.fetchCandles('DOGEUSDT');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('T-2: builds the request URL only from the allowlisted symbol and the fixed Binance base URL', async () => {
    const fetchSpy = vi.fn(() => jsonResponse(klinesOk));
    vi.stubGlobal('fetch', fetchSpy);
    const source = new BinanceHttpSource();

    await source.fetchCandles('BTCUSDT');

    expect(fetchSpy).toHaveBeenCalledWith(`${BINANCE_KLINES_BASE_URL}?symbol=BTCUSDT&interval=1h&limit=50`);
  });
});
