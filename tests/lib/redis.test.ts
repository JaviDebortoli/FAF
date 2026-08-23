import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Construction-options guard for the REAL `src/lib/redis.ts` —
// presentation-cache-persistence design.md, "Remediation Phase F"
// (2026-08-23). This is the ONLY test that exercises the real `getRedis()`
// construction line: every downstream test injects the fake via
// `vi.mock('@/src/lib/redis', ...)`, so nothing else pins HOW the client is
// constructed. The 2026-08-23 production outage (deterministic 503 on both
// markets, green n8n writes) was caused exactly here: `new Redis({ url,
// token })` without `automaticDeserialization: false` made the SDK auto-parse
// JSON-looking values, `src/cycle/latest.ts`'s `JSON.parse(raw)` then threw a
// `SyntaxError` on an already-parsed object, and the fail-open `catch`
// swallowed it into `null` -> `503 NO_DATA`.
//
// `vi.mock('@upstash/redis')` (constructor spy, no factory -> automock) is
// the low-level-client mock pattern established by
// `tests/narrative/client.test.ts`'s `vi.mock('@anthropic-ai/sdk', ...)`.
// `vi.resetModules()` + dynamic import per test keeps the module-scope
// `client` singleton isolated between cases.

vi.mock('@upstash/redis');

const URL_ENV = 'UPSTASH_REDIS_REST_URL';
const TOKEN_ENV = 'UPSTASH_REDIS_REST_TOKEN';

describe('getRedis() client construction (design.md "Remediation Phase F" regression net)', () => {
  beforeEach(() => {
    vi.resetModules();
    // getRedis() resolves env vars lazily inside the call, but setting them
    // before the dynamic import also guards against any future import-time
    // read.
    process.env[URL_ENV] = 'https://fake.upstash.io';
    process.env[TOKEN_ENV] = 'fake-token';
  });

  afterEach(() => {
    delete process.env[URL_ENV];
    delete process.env[TOKEN_ENV];
  });

  it('constructs the Redis client with automaticDeserialization: false', async () => {
    const { Redis } = await import('@upstash/redis');
    const { getRedis } = await import('@/src/lib/redis');

    getRedis();

    expect(Redis).toHaveBeenCalledTimes(1);
    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://fake.upstash.io',
        token: 'fake-token',
        automaticDeserialization: false,
      }),
    );
  });
});
