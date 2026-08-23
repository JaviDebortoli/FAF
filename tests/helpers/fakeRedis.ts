/**
 * In-memory fake implementing the slice of `@upstash/redis`'s client
 * surface `src/cycle/latest.ts`/`src/narrative/cache.ts` actually use
 * (`get`, `set`, `del`) — presentation-cache-persistence design.md's "Test
 * double" decision: mock the low-level external client, not the module
 * under test, mirroring `tests/narrative/client.test.ts`'s
 * `vi.mock('@anthropic-ai/sdk', ...)` pattern so the real cache modules'
 * key scheme, serialization, and error-handling logic stay genuinely
 * exercised.
 *
 * Injected via `vi.mock('@/src/lib/redis', () => ({ getRedis: () =>
 * fakeRedis }))` in downstream (Phase B/C/D) test files.
 *
 * TTL is tracked against `Date.now()`, never `setTimeout`, so it composes
 * with `vi.useFakeTimers()`/`vi.setSystemTime()` — advancing fake time past
 * an entry's expiry makes it invisible on the next `get`/`set` without any
 * background timer.
 */

interface Entry {
  value: unknown;
  /** `null` means no expiry was requested (no `ex` option passed). */
  expiresAtMs: number | null;
}

const store = new Map<string, Entry>();

function isExpired(entry: Entry): boolean {
  return entry.expiresAtMs !== null && Date.now() >= entry.expiresAtMs;
}

export interface SetOptions {
  /** Seconds until expiry — mirrors `@upstash/redis`'s `SetCommandOptions.ex`. */
  ex?: number;
}

export const fakeRedis = {
  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  async set<T>(key: string, value: T, opts?: SetOptions): Promise<'OK'> {
    const expiresAtMs = opts?.ex !== undefined ? Date.now() + opts.ex * 1000 : null;
    store.set(key, { value, expiresAtMs });
    return 'OK';
  },

  async del(key: string): Promise<number> {
    return store.delete(key) ? 1 : 0;
  },

  /** Test-only helper: clears all entries so tests do not leak state across cases. */
  __reset(): void {
    store.clear();
  },
};
