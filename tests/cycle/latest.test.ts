import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis } from '@/tests/helpers/fakeRedis';
import * as cache from '@/src/cycle/latest';
import type { Decision, DecisionReport, Market } from '@/src/domain/types';

// semantic-ingestion spec "Market-keyed presentation cache" (MODIFIED
// requirement, presentation-cache-persistence): src/cycle/latest.ts moves
// from a process-local in-memory Map to an async, Redis-backed store
// (design.md's "Redis client type"/"Read failure handling"/"Write failure
// handling"/"TTL granularity"/"atMs parameter" decisions). Mocks the
// low-level client (`@/src/lib/redis`'s `getRedis()`), never the module
// under test, mirroring tests/narrative/client.test.ts's
// vi.mock('@anthropic-ai/sdk', ...) pattern — so latest.ts's real key
// scheme, serialization, and error-handling logic stay genuinely exercised.

vi.mock('@/src/lib/redis', () => ({ getRedis: () => fakeRedis }));

const T1 = 1_700_000_000_000;

function makeDecision(market: Market, asset: string): Decision {
  return {
    asset,
    market,
    t: T1,
    recommendation: 'NO_RECOMMENDATION',
    reason: 'NO_EVIDENCE',
    bullish: { thesis: 'bullish', supporters: [], aggregated: { gamma: 0, rho: 0 }, net: { gamma: 0, rho: 0 }, score: 0 },
    bearish: { thesis: 'bearish', supporters: [], aggregated: { gamma: 0, rho: 0 }, net: { gamma: 0, rho: 0 }, score: 0 },
    gap: 0,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [] },
  };
}

function makeReport(market: Market, cycleId: string, decisions: Decision[] = []): DecisionReport {
  return { cycleId, market, computedAt: T1, decisions };
}

beforeEach(async () => {
  fakeRedis.__reset();
  await cache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('market-keyed cache isolation (semantic-ingestion: Market-keyed presentation cache)', () => {
  it('an acciones push does not affect the crypto cache entry', async () => {
    const cryptoReport = makeReport('crypto', 'cycle_crypto');
    await cache.put('crypto', cryptoReport, 60_000);

    const accionesReport = makeReport('acciones', 'cycle_acciones');
    await cache.put('acciones', accionesReport, 60_000);

    await expect(cache.get('crypto')).resolves.toEqual(cryptoReport);
    await expect(cache.get('acciones')).resolves.toEqual(accionesReport);
  });

  it('a crypto push does not affect the acciones cache entry', async () => {
    const accionesReport = makeReport('acciones', 'cycle_acciones');
    await cache.put('acciones', accionesReport, 60_000);

    const cryptoReport = makeReport('crypto', 'cycle_crypto');
    await cache.put('crypto', cryptoReport, 60_000);

    await expect(cache.get('acciones')).resolves.toEqual(accionesReport);
    await expect(cache.get('crypto')).resolves.toEqual(cryptoReport);
  });

  it('each market cache entry expires independently of the other market TTL (Redis-native EX)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cache.put('crypto', makeReport('crypto', 'cycle_crypto'), 1_000);
    await cache.put('acciones', makeReport('acciones', 'cycle_acciones'), 60_000);

    // crypto's 1s TTL (ttlMs=1_000 -> ceil(1_000/1_000)=1s) has elapsed by
    // t=1_000ms; acciones's 60s TTL has not.
    vi.setSystemTime(1_000);

    await expect(cache.get('crypto')).resolves.toBeNull();
    const acciones = await cache.get('acciones');
    expect(acciones?.cycleId).toBe('cycle_acciones');
  });

  it('getForAsset(market, asset) reads only its own market — a symbol present in both markets never crosses over', async () => {
    const cryptoDecision = makeDecision('crypto', 'AAPL');
    const accionesDecision = makeDecision('acciones', 'AAPL');
    await cache.put('crypto', makeReport('crypto', 'cycle_crypto', [cryptoDecision]), 60_000);
    await cache.put('acciones', makeReport('acciones', 'cycle_acciones', [accionesDecision]), 60_000);

    await expect(cache.getForAsset('crypto', 'AAPL')).resolves.toEqual(cryptoDecision);
    await expect(cache.getForAsset('acciones', 'AAPL')).resolves.toEqual(accionesDecision);
  });

  it('getForAsset(market, asset) is a miss when the asset only exists under the other market', async () => {
    await cache.put('crypto', makeReport('crypto', 'cycle_crypto', [makeDecision('crypto', 'BTCUSDT')]), 60_000);

    await expect(cache.getForAsset('acciones', 'BTCUSDT')).resolves.toBeNull();
  });

  it('clear() clears every known market — both markets miss afterward', async () => {
    await cache.put('crypto', makeReport('crypto', 'cycle_crypto'), 60_000);
    await cache.put('acciones', makeReport('acciones', 'cycle_acciones'), 60_000);

    await cache.clear();

    await expect(cache.get('crypto')).resolves.toBeNull();
    await expect(cache.get('acciones')).resolves.toBeNull();
  });
});

describe('Redis key scheme (cycle:latest:{market})', () => {
  it('put() stores the JSON-serialized report under the exact key `cycle:latest:{market}`', async () => {
    const cryptoReport = makeReport('crypto', 'cycle_crypto');
    await cache.put('crypto', cryptoReport, 60_000);

    const raw = await fakeRedis.get<string>('cycle:latest:crypto');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(cryptoReport);
  });

  it('each market is stored under its own distinct key, never sharing storage', async () => {
    await cache.put('crypto', makeReport('crypto', 'cycle_crypto'), 60_000);
    await cache.put('acciones', makeReport('acciones', 'cycle_acciones'), 60_000);

    const cryptoRaw = await fakeRedis.get<string>('cycle:latest:crypto');
    const accionesRaw = await fakeRedis.get<string>('cycle:latest:acciones');
    expect(JSON.parse(cryptoRaw as string).cycleId).toBe('cycle_crypto');
    expect(JSON.parse(accionesRaw as string).cycleId).toBe('cycle_acciones');
  });
});

describe('fail-open on Redis read failure (semantic-ingestion: Redis unreachable on read yields the existing no-data contract)', () => {
  it('get() returns null (not a thrown error) when the underlying Redis client rejects', async () => {
    await cache.put('crypto', makeReport('crypto', 'cycle_crypto'), 60_000);
    vi.spyOn(fakeRedis, 'get').mockRejectedValueOnce(new Error('simulated Redis read failure'));

    await expect(cache.get('crypto')).resolves.toBeNull();
  });

  it('getForAsset() returns null (not a thrown error) when the underlying Redis client rejects', async () => {
    await cache.put('crypto', makeReport('crypto', 'cycle_crypto', [makeDecision('crypto', 'BTCUSDT')]), 60_000);
    vi.spyOn(fakeRedis, 'get').mockRejectedValueOnce(new Error('simulated Redis read failure'));

    await expect(cache.getForAsset('crypto', 'BTCUSDT')).resolves.toBeNull();
  });
});

describe('put() write-failure propagation (design.md: no fallback store, caller must be able to detect a lost write)', () => {
  it('put() rejects when the underlying Redis client rejects, instead of silently swallowing the error', async () => {
    vi.spyOn(fakeRedis, 'set').mockRejectedValueOnce(new Error('simulated Redis write failure'));

    await expect(cache.put('crypto', makeReport('crypto', 'cycle_crypto'), 60_000)).rejects.toThrow(
      'simulated Redis write failure',
    );
  });
});
