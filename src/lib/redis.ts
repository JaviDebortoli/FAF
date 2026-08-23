import { Redis } from '@upstash/redis';

/**
 * Lazy singleton around `@upstash/redis`'s REST client — the shared backend
 * for `src/cycle/latest.ts` and `src/narrative/cache.ts`
 * (presentation-cache-persistence design.md, "Client construction" decision).
 *
 * `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
 * and throws if either is missing/misconfigured. That construction is
 * deferred to the FIRST call to `getRedis()`, never module scope — mirrors
 * `src/narrative/client.ts`'s T-5 deferred-construction pattern, so a
 * missing/misconfigured env var surfaces as a caught runtime error inside a
 * cache module's `get`/`put` (which callers already handle per design.md's
 * read/write failure decisions), not an import-time crash that would break
 * every route and `next build`.
 *
 * The REST client (not `ioredis`'s pooled TCP client) is the deliberate
 * choice for this serverless/Fluid Compute execution model — see
 * design.md's "Redis client type" decision.
 */
let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = Redis.fromEnv();
  }
  return client;
}
