import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cache from '@/src/cycle/latest';
import { buildReport, seedCycleCache } from '../helpers/seedCycleCache';

// design.md "GET /api/decisions no-data is 503 NO_DATA, not an empty 200":
// this route is now a pure cache read (push-only ingestion, design.md
// Supersession section). It never pulls candles itself — a cache miss
// (including an expired entry) is a defined 503, never a recompute. A
// never-called `fetch` spy on every case proves the push-only invariant
// behaviorally, alongside tests/api/pushOnly.test.ts's structural guard.

beforeEach(() => {
  cache.clear();
});

afterEach(() => {
  cache.clear();
  vi.unstubAllGlobals();
});

describe('GET /api/decisions', () => {
  it('cache hit -> 200 with the cached report, never calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const report = buildReport();
    seedCycleCache(report);
    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET();
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'Service temporarily unavailable', code: 'NO_DATA' });
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('expired cache entry -> 503 NO_DATA, never calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    seedCycleCache(buildReport(), 1);
    await new Promise((resolve) => setTimeout(resolve, 5));

    const { GET } = await import('@/app/api/decisions/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('NO_DATA');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
