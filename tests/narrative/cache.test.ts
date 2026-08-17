import { beforeEach, describe, expect, it } from 'vitest';
import * as cache from '@/src/narrative/cache';
import { BETA_MS } from '@/src/cycle/constants';

// design.md "Caching": src/narrative/cache.ts mirrors src/cycle/latest.ts's
// shape — module-scope Map, key `${asset}:${decision.t}`, TTL BETA_MS,
// bounded to 16 entries with oldest-eviction so a long-lived instance
// cannot grow unbounded. decision.t (not wall-clock) makes the key
// deterministic, so a new t for the same asset must be a cache MISS even
// while the old entry is still technically within its own TTL.

const ASSET = 'BTCUSDT';
const T1 = 1_700_000_000_000;
const T2 = 1_700_003_600_000; // a later decision.t for the same asset

beforeEach(() => {
  cache.clear();
});

describe('narrative cache get/put', () => {
  it('stores and retrieves a narrative keyed by `${asset}:${t}`', () => {
    cache.put(ASSET, T1, 'narrativa completa', BETA_MS, 0);

    expect(cache.get(ASSET, T1, 0)).toBe('narrativa completa');
  });

  it('is a miss for an asset/t pair that was never stored', () => {
    expect(cache.get(ASSET, T1, 0)).toBeNull();
  });

  it('is a miss before expiresAt is reached is false — still a hit strictly within the TTL window', () => {
    cache.put(ASSET, T1, 'narrativa', BETA_MS, 0);

    expect(cache.get(ASSET, T1, BETA_MS - 1)).toBe('narrativa');
  });

  it('expires exactly at atMs === expiresAt (boundary is exclusive, mirrors src/cycle/latest.ts)', () => {
    cache.put(ASSET, T1, 'narrativa', BETA_MS, 0);

    expect(cache.get(ASSET, T1, BETA_MS)).toBeNull();
  });

  it('a new decision.t for the same asset is a MISS, independent of the old entry still being within its TTL (cache-invalidation-on-new-t)', () => {
    cache.put(ASSET, T1, 'narrativa vieja', BETA_MS, 0);

    // Old entry is still technically fresh (t1, atMs=100 << BETA_MS), but a
    // request for the NEW decision.t (t2) must not see it.
    expect(cache.get(ASSET, T2, 100)).toBeNull();
    // The old entry itself is untouched and still independently retrievable.
    expect(cache.get(ASSET, T1, 100)).toBe('narrativa vieja');
  });
});

describe('narrative cache bounded size (16 entries, oldest-eviction)', () => {
  it('evicts the oldest-inserted entry once the 17th distinct key is stored', () => {
    for (let i = 0; i < 16; i += 1) {
      cache.put(`ASSET${i}`, T1, `text-${i}`, BETA_MS, 0);
    }
    // All 16 are present.
    for (let i = 0; i < 16; i += 1) {
      expect(cache.get(`ASSET${i}`, T1, 0)).toBe(`text-${i}`);
    }

    // 17th distinct key evicts the oldest (ASSET0).
    cache.put('ASSET16', T1, 'text-16', BETA_MS, 0);

    expect(cache.get('ASSET0', T1, 0)).toBeNull();
    expect(cache.get('ASSET1', T1, 0)).toBe('text-1'); // next-oldest survives
    expect(cache.get('ASSET16', T1, 0)).toBe('text-16');
  });

  it('overwriting an existing key does not count as a new entry and does not evict', () => {
    for (let i = 0; i < 16; i += 1) {
      cache.put(`ASSET${i}`, T1, `text-${i}`, BETA_MS, 0);
    }

    // Re-store the same (asset, t) key — must not evict ASSET0.
    cache.put('ASSET0', T1, 'text-0-updated', BETA_MS, 0);

    expect(cache.get('ASSET0', T1, 0)).toBe('text-0-updated');
    for (let i = 1; i < 16; i += 1) {
      expect(cache.get(`ASSET${i}`, T1, 0)).toBe(`text-${i}`);
    }
  });
});

describe('narrative cache atomic write API (only clean/complete narratives are ever stored)', () => {
  it('exposes only get/put/clear — no partial/streaming write method exists, so a caller can only ever store one complete string per key', () => {
    expect(Object.keys(cache).sort()).toEqual(['clear', 'get', 'put']);
  });
});
