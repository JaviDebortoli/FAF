import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cache from '@/src/cycle/latest';

// design.md D-B: GET /api/decisions serves the cached report if younger
// than beta, otherwise recomputes on demand. Correctness never depends on
// the cache — a cache-miss recompute must equal a cache-hit for the exact
// same underlying data (runCycle is pure).

function klinesResponse(): Response {
  const klines = Array.from({ length: 60 }, (_, i) => [
    1_700_000_000_000 + i * 3_600_000, // openTime
    100 + i, // open
    100 + i, // high
    100 + i, // low
    100 + i, // close
    1000, // volume
  ]);
  return new Response(JSON.stringify(klines), { status: 200 });
}

beforeEach(() => {
  cache.clear();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(klinesResponse())));
});

afterEach(() => {
  cache.clear();
  vi.unstubAllGlobals();
});

describe('GET /api/decisions', () => {
  it('serves the cached report on a cache hit without pulling candles again', async () => {
    const { runCycle } = await import('@/src/cycle/runCycle');
    const { pullAllAssets } = await import('@/src/cycle/pullAssets');
    const { GET } = await import('@/app/api/decisions/route');

    const assets = await pullAllAssets();
    const primed = runCycle(assets);
    cache.put(primed, 60_000);

    const fetchSpy = vi.fn(() => Promise.resolve(klinesResponse()));
    vi.stubGlobal('fetch', fetchSpy);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body.cycleId).toBe(primed.cycleId);
  });

  it('cache-hit and cache-miss-recompute produce equal output for the same underlying data', async () => {
    const { runCycle } = await import('@/src/cycle/runCycle');
    const { pullAllAssets } = await import('@/src/cycle/pullAssets');
    const { GET } = await import('@/app/api/decisions/route');

    const assets = await pullAllAssets();
    const primed = runCycle(assets);
    cache.put(primed, 60_000);

    const hitResponse = await GET();
    const hitBody = await hitResponse.json();

    cache.clear();

    const missResponse = await GET();
    const missBody = await missResponse.json();

    expect(JSON.stringify(hitBody)).toBe(JSON.stringify(missBody));
  });

  it('recomputes on demand (cache miss) by pulling candles itself and returns 200', async () => {
    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.decisions)).toBe(true);
  });
});
