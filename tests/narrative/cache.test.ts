import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis } from '@/tests/helpers/fakeRedis';
import * as cache from '@/src/narrative/cache';
import { BETA_MS } from '@/src/cycle/constants';

// decision-narrative spec "Cost-mitigation caching" (MODIFIED requirement,
// presentation-cache-persistence): src/narrative/cache.ts moves from a
// process-local, MAX_ENTRIES-bounded in-memory Map to an async, Redis-backed
// store (design.md's "Redis client type"/"Read failure handling"/"Write
// failure handling"/"TTL granularity"/"atMs parameter"/"MAX_ENTRIES" (narrative
// cache) decisions). Mocks the low-level client (`@/src/lib/redis`'s
// `getRedis()`), never the module under test, mirroring
// tests/cycle/latest.test.ts's identical pattern — so cache.ts's real key
// scheme, serialization, and error-handling logic stay genuinely exercised.
//
// Unlike src/cycle/latest.ts's `put`, this module's `put` NEVER throws to the
// caller (design.md's Interfaces/Contracts: "never throws to caller") — this
// cache is cost-mitigation only, never correctness-bearing, so a lost write
// must be invisible to the caller rather than surfaced as a rejected Promise.

vi.mock('@/src/lib/redis', () => ({ getRedis: () => fakeRedis }));

const ASSET = 'BTCUSDT';
const T1 = 1_700_000_000_000;
const T2 = 1_700_003_600_000; // a later decision.t for the same asset

beforeEach(() => {
  fakeRedis.__reset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('narrative cache get/put', () => {
  it('stores and retrieves a narrative keyed by (asset, t)', async () => {
    await cache.put(ASSET, T1, 'narrativa completa');

    await expect(cache.get(ASSET, T1)).resolves.toBe('narrativa completa');
  });

  it('is a miss for an asset/t pair that was never stored', async () => {
    await expect(cache.get(ASSET, T1)).resolves.toBeNull();
  });

  it('is still a hit strictly within the TTL window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cache.put(ASSET, T1, 'narrativa', BETA_MS);
    vi.setSystemTime(BETA_MS - 1_000);

    await expect(cache.get(ASSET, T1)).resolves.toBe('narrativa');
  });

  it('expires via Redis-native TTL once ttlMs has elapsed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cache.put(ASSET, T1, 'narrativa', 1_000);
    vi.setSystemTime(1_000);

    await expect(cache.get(ASSET, T1)).resolves.toBeNull();
  });

  it('a new decision.t for the same asset is a MISS, independent of the old entry still being within its TTL (cache-invalidation-on-new-t)', async () => {
    await cache.put(ASSET, T1, 'narrativa vieja');

    // A request for the NEW decision.t (t2) must not see the old entry.
    await expect(cache.get(ASSET, T2)).resolves.toBeNull();
    // The old entry itself is untouched and still independently retrievable.
    await expect(cache.get(ASSET, T1)).resolves.toBe('narrativa vieja');
  });

  it('put() defaults ttlMs to BETA_MS when omitted', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await cache.put(ASSET, T1, 'narrativa default-ttl');
    vi.setSystemTime(BETA_MS - 1_000);

    await expect(cache.get(ASSET, T1)).resolves.toBe('narrativa default-ttl');
  });
});

describe('Redis key scheme (narrative:{asset}:{t})', () => {
  it('put() stores the text under the exact key `narrative:{asset}:{t}`', async () => {
    await cache.put(ASSET, T1, 'narrativa completa');

    const raw = await fakeRedis.get<string>(`narrative:${ASSET}:${T1}`);
    expect(raw).toBe('narrativa completa');
  });

  it('each (asset, t) pair is stored under its own distinct key, never sharing storage', async () => {
    await cache.put(ASSET, T1, 'texto-1');
    await cache.put(ASSET, T2, 'texto-2');

    const raw1 = await fakeRedis.get<string>(`narrative:${ASSET}:${T1}`);
    const raw2 = await fakeRedis.get<string>(`narrative:${ASSET}:${T2}`);
    expect(raw1).toBe('texto-1');
    expect(raw2).toBe('texto-2');
  });
});

describe('fail-open on Redis read failure (this cache is cost-mitigation only, a read failure must degrade to a regenerate, not an error)', () => {
  it('get() returns null (not a thrown error) when the underlying Redis client rejects', async () => {
    await cache.put(ASSET, T1, 'narrativa completa');
    vi.spyOn(fakeRedis, 'get').mockRejectedValueOnce(new Error('simulated Redis read failure'));

    await expect(cache.get(ASSET, T1)).resolves.toBeNull();
  });
});

describe('put() write-failure is swallowed, not propagated (design.md Interfaces/Contracts: "never throws to caller")', () => {
  it('put() resolves (does not reject) when the underlying Redis client rejects', async () => {
    vi.spyOn(fakeRedis, 'set').mockRejectedValueOnce(new Error('simulated Redis write failure'));

    await expect(cache.put(ASSET, T1, 'narrativa completa')).resolves.toBeUndefined();
  });

  it('after a swallowed write failure, a subsequent get() is a genuine miss (no partial/corrupt entry was written)', async () => {
    vi.spyOn(fakeRedis, 'set').mockRejectedValueOnce(new Error('simulated Redis write failure'));

    await cache.put(ASSET, T1, 'narrativa completa');

    await expect(cache.get(ASSET, T1)).resolves.toBeNull();
  });
});

describe('narrative cache atomic write API (only clean/complete narratives are ever stored)', () => {
  it('exposes only get/put/clear — no partial/streaming write method exists, so a caller can only ever store one complete string per key', () => {
    expect(Object.keys(cache).sort()).toEqual(['clear', 'get', 'put']);
  });

  it('clear() resolves without throwing (documented gap: unlike src/cycle/latest.ts, this cache has no enumerable/finite key space to sweep with only get/set/del, so clear() is test-only and does not evict real entries — see src/narrative/cache.ts doc comment)', async () => {
    await expect(cache.clear()).resolves.toBeUndefined();
  });
});
