import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis } from '@/tests/helpers/fakeRedis';
import * as cache from '@/src/cycle/latest';
import { buildDecision, buildReport, seedCycleCache } from '../helpers/seedCycleCache';

// design.md "GET /api/decisions no-data is 503 NO_DATA, not an empty 200":
// this route is now a pure cache read (push-only ingestion, design.md
// Supersession section). It never pulls candles itself — a cache miss
// (including an expired entry) is a defined 503, never a recompute. A
// never-called `fetch` spy on every case proves the push-only invariant
// behaviorally, alongside tests/api/pushOnly.test.ts's structural guard.
//
// presentation-cache-persistence design.md's "Test double" decision: mock
// the low-level Redis client (`@/src/lib/redis`), not the module under
// test, so `src/cycle/latest.ts`'s real key scheme/error-handling stays
// genuinely exercised through this route.
vi.mock('@/src/lib/redis', () => ({ getRedis: () => fakeRedis }));

beforeEach(async () => {
  fakeRedis.__reset();
  await cache.clear();
});

afterEach(async () => {
  await cache.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function makeGetRequest(market?: string): Request {
  const url = market === undefined ? 'http://x/api/decisions' : `http://x/api/decisions?market=${market}`;
  return new Request(url);
}

describe('GET /api/decisions', () => {
  it('cache hit -> 200 with the cached report, never calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const report = buildReport();
    await seedCycleCache(report, 'crypto');
    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET(makeGetRequest('crypto'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cycleId).toBe(report.cycleId);
    expect(body.decisions).toHaveLength(report.decisions.length);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cache miss (nothing ever seeded) -> 503 NO_DATA with Retry-After, never calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET(makeGetRequest('crypto'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'Service temporarily unavailable', code: 'NO_DATA' });
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('expired cache entry -> 503 NO_DATA, never calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // design.md "TTL granularity": TTL is now Redis-native EX (second
    // precision, ceil(ttlMs / 1000)), so sub-second boundaries must move to
    // Vitest fake timers rather than a real `setTimeout` wait.
    vi.useFakeTimers();
    vi.setSystemTime(0);
    await seedCycleCache(buildReport(), 'crypto', 1_000);
    vi.setSystemTime(1_000);

    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET(makeGetRequest('crypto'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('NO_DATA');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('missing market query param -> 400, never calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('invalid market query param value -> 400, never calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET(makeGetRequest('forex'));

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Redis read failure -> 503 NO_DATA (fail-open), never calling fetch (semantic-ingestion: Redis unreachable on read yields the existing no-data contract)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await seedCycleCache(buildReport(), 'crypto');
    vi.spyOn(fakeRedis, 'get').mockRejectedValueOnce(new Error('simulated Redis read failure'));

    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET(makeGetRequest('crypto'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'Service temporarily unavailable', code: 'NO_DATA' });
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('acciones-scoped read never returns a crypto decision — reads its own market only', async () => {
    const cryptoReport = buildReport();
    const accionesReport = buildReport([buildDecision({ asset: 'AAPL', market: 'acciones' })], 'acciones');
    await seedCycleCache(cryptoReport, 'crypto');
    await seedCycleCache(accionesReport, 'acciones');
    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET(makeGetRequest('acciones'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.market).toBe('acciones');
    expect(body.decisions.every((d: { asset: string }) => d.asset !== 'BTCUSDT')).toBe(true);
    expect(body.decisions.some((d: { asset: string }) => d.asset === 'AAPL')).toBe(true);
  });
});
