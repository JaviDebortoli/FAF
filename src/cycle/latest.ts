import { getRedis } from '@/src/lib/redis';
import type { Asset, Decision, DecisionReport, Market, Millis } from '@/src/domain/types';

/**
 * Redis-backed cache (presentation-cache-persistence design.md, "Redis
 * client type"/"Client construction" decisions; semantic-ingestion
 * "Market-keyed presentation cache", MODIFIED requirement): holds the most
 * recently POSTed `DecisionReport` per `market`, produced by one
 * `/api/cycle` call for that market, for up to `ttlMs` (BETA_MS).
 *
 * Market-keyed (one Redis key per market, `cycle:latest:{market}`) rather
 * than a single global entry: a push for one market must never overwrite,
 * clear, or otherwise affect another market's cached entry — the
 * cross-market overwrite hazard a single-entry cache would have by
 * construction.
 *
 * Durable and cross-instance-shared (Redis, not a process-local `Map`): a
 * write from one serverless function instance must be visible to a read
 * served by a different instance — the correctness requirement this module
 * exists to satisfy (semantic-ingestion "Write is visible to a read served
 * by a different instance").
 *
 * Push-only ingestion: `POST /api/cycle` is the sole writer of this cache.
 * `GET /api/decisions` and the narrative route are pure readers — a cache
 * MISS (nothing pushed yet, or the last push expired, or Redis is
 * unreachable) is a defined no-data state (`503 NO_DATA` / `404
 * NO_DECISION`), never a recompute. §5 "no store retains reasoning state
 * between cycles" still holds: this cache is never read by the reasoning
 * core (L1-L4), only by the presentation read paths.
 */

/** All markets this cache tracks — used only by `clear()` to reset every known key. */
const MARKETS: readonly Market[] = ['crypto', 'acciones'];

function keyFor(market: Market): string {
  return `cycle:latest:${market}`;
}

/**
 * Stores `report` for `market`, expiring via Redis-native TTL (`SET ... EX
 * <seconds>`, `ttlMs` rounded up to the nearest whole second, minimum 1s —
 * design.md's "TTL granularity" decision).
 *
 * Does NOT catch Redis errors — write failures propagate to the caller
 * (design.md's "Write failure handling" decision: this cache has no
 * fallback store, so a silently-lost write means the report is durably
 * nowhere; `POST /api/cycle` is responsible for turning a rejected `put`
 * into a `502 CACHE_WRITE_FAILED` response).
 */
export async function put(market: Market, report: DecisionReport, ttlMs: Millis): Promise<void> {
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  await getRedis().set(keyFor(market), JSON.stringify(report), { ex: ttlSeconds });
}

/**
 * Returns `market`'s cached report, or `null` on a genuine cache miss/TTL
 * expiry OR on any Redis read failure (fail-open — design.md's "Read
 * failure handling" decision: a `null` is indistinguishable from a real
 * cache miss, so the caller's existing `503 NO_DATA` path fires unchanged
 * with no new error branch needed in the routes).
 */
export async function get(market: Market): Promise<DecisionReport | null> {
  try {
    const raw = await getRedis().get<string>(keyFor(market));
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw) as DecisionReport;
  } catch {
    return null;
  }
}

/**
 * Convenience lookup: this asset's Decision from `market`'s cached report,
 * if fresh. Inherits `get`'s fail-open behavior (a Redis read failure here
 * resolves to `null`, never a thrown error).
 */
export async function getForAsset(market: Market, asset: Asset): Promise<Decision | null> {
  const report = await get(market);
  if (!report) return null;
  return report.decisions.find((d) => d.asset === asset) ?? null;
}

/** Test-only helper: clears every known market's cache entry so tests do not leak state across cases. */
export async function clear(): Promise<void> {
  const redis = getRedis();
  await Promise.all(MARKETS.map((market) => redis.del(keyFor(market))));
}
