import { Redis } from '@upstash/redis';

/**
 * Lazy singleton around `@upstash/redis`'s REST client — the shared backend
 * for `src/cycle/latest.ts` and `src/narrative/cache.ts`
 * (presentation-cache-persistence design.md, "Client construction" decision).
 *
 * Does NOT use `Redis.fromEnv()`: that helper only checks
 * `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, falling back to
 * `KV_REST_API_URL`/`KV_REST_API_TOKEN`. This project's actual Vercel
 * Marketplace "Upstash for Redis" integration injects a THIRD naming
 * convention on top of that — `UPTASH_FOR_REDIS_KV_REST_API_URL`/
 * `UPTASH_FOR_REDIS_KV_REST_API_TOKEN` (a project-scoped prefix the
 * integration adds and locks; not renameable) — confirmed against the
 * live Vercel project's actual injected variable names, none of which
 * `Redis.fromEnv()` would find. `envUrl`/`envToken` extend the SDK's own
 * fallback-chain convention with that one additional, project-specific
 * name, same rationale as the SDK's own KV_* fallback: different
 * integrations name the same two values differently.
 *
 * Construction is deferred to the FIRST call to `getRedis()`, never module
 * scope — mirrors `src/narrative/client.ts`'s T-5 deferred-construction
 * pattern, so a missing/misconfigured env var surfaces as a caught runtime
 * error inside a cache module's `get`/`put` (which callers already handle
 * per design.md's read/write failure decisions), not an import-time crash
 * that would break every route and `next build`.
 *
 * The REST client (not `ioredis`'s pooled TCP client) is the deliberate
 * choice for this serverless/Fluid Compute execution model — see
 * design.md's "Redis client type" decision.
 *
 * `automaticDeserialization: false` is MANDATORY, not cosmetic
 * (design.md "Remediation Phase F", 2026-08-23): the SDK defaults it to
 * `true`, which makes `get()` auto-parse JSON-looking values and return the
 * parsed OBJECT. `src/cycle/latest.ts` then runs `JSON.parse(raw)` on that
 * object, throwing a `SyntaxError` that the deliberate fail-open `catch`
 * swallows into `null` -> deterministic `503 NO_DATA` on every read while
 * writes stay green — the exact chain behind the 2026-08-23 production
 * outage. Disabling it keeps the explicit `JSON.stringify`/`JSON.parse`
 * contract in the cache modules and makes production behavior exactly match
 * `tests/helpers/fakeRedis.ts`'s verbatim-value semantics; the guard test
 * `tests/lib/redis.test.ts` pins this option.
 */
function envUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPTASH_FOR_REDIS_KV_REST_API_URL;
}

function envToken(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPTASH_FOR_REDIS_KV_REST_API_TOKEN
  );
}

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    const url = envUrl();
    const token = envToken();
    if (!url || !token) {
      throw new Error('[Redis] Missing REST URL/token — no known env var naming convention matched.');
    }
    client = new Redis({ url, token, automaticDeserialization: false });
  }
  return client;
}
