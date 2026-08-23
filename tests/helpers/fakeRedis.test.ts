import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis } from '@/tests/helpers/fakeRedis';

// Self-test for the fake-Redis test double (presentation-cache-persistence
// tasks.md A.5): Phases B/C/D's real cache-module tests depend on this fake
// correctly implementing get/set/del + expiry semantics, so its own
// correctness is proven here before anything else builds on it.

beforeEach(() => {
  fakeRedis.__reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fakeRedis — get/set roundtrip', () => {
  it('returns the value set for a key', async () => {
    await fakeRedis.set('k1', 'hello');

    await expect(fakeRedis.get('k1')).resolves.toBe('hello');
  });

  it('returns null for a key that was never set', async () => {
    await expect(fakeRedis.get('missing')).resolves.toBeNull();
  });
});

describe('fakeRedis — expiry (`ex` option)', () => {
  it('still returns the value before the ex window elapses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await fakeRedis.set('k1', 'still-fresh', { ex: 10 });
    vi.setSystemTime(9_000); // 9s < 10s TTL

    await expect(fakeRedis.get('k1')).resolves.toBe('still-fresh');
  });

  it('expires the entry once fake-timer time passes the ex window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await fakeRedis.set('k1', 'will-expire', { ex: 10 });
    vi.setSystemTime(10_001); // just past the 10s TTL

    await expect(fakeRedis.get('k1')).resolves.toBeNull();
  });

  it('never expires a key set without an `ex` option', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    await fakeRedis.set('k1', 'no-ttl');
    vi.setSystemTime(1_000 * 60 * 60 * 24 * 365); // one year later

    await expect(fakeRedis.get('k1')).resolves.toBe('no-ttl');
  });
});

describe('fakeRedis — del', () => {
  it('removes a key so a subsequent get misses', async () => {
    await fakeRedis.set('k1', 'value');

    const deleted = await fakeRedis.del('k1');

    expect(deleted).toBe(1);
    await expect(fakeRedis.get('k1')).resolves.toBeNull();
  });

  it('returns 0 when deleting a key that does not exist', async () => {
    await expect(fakeRedis.del('missing')).resolves.toBe(0);
  });
});

describe('fakeRedis — __reset', () => {
  it('clears all entries', async () => {
    await fakeRedis.set('k1', 'value');
    await fakeRedis.set('k2', 'value');

    fakeRedis.__reset();

    await expect(fakeRedis.get('k1')).resolves.toBeNull();
    await expect(fakeRedis.get('k2')).resolves.toBeNull();
  });
});
