import type { Asset, Decision, DecisionReport, Market, Millis } from '@/src/domain/types';

/**
 * Module-scope cache (dynamic-asset-count design.md Supersession section;
 * market-keyed per design.md D-B / semantic-ingestion "Market-keyed
 * presentation cache"): holds the most recently POSTed `DecisionReport` per
 * `market`, produced by one `/api/cycle` call for that market, for up to
 * `ttlMs` (BETA_MS).
 *
 * Market-keyed (`Map<Market, CacheEntry>`, mirroring src/narrative/cache.ts's
 * per-key Map shape) rather than a single global entry: a push for one
 * market must never overwrite, clear, or otherwise affect another market's
 * cached entry — the cross-market overwrite hazard the prior single-entry
 * cache had by construction, since every market shares the same in-memory
 * module instance.
 *
 * Push-only ingestion: `POST /api/cycle` is the sole writer of this cache.
 * `GET /api/decisions` and the narrative route are pure readers — a cache
 * MISS (nothing pushed yet, or the last push expired) is a defined no-data
 * state (`503 NO_DATA` / `404 NO_DECISION`), never a recompute. The prior
 * "cache miss recomputes via a server-side Binance pull" design (D-B) is
 * retired: because this is a plain in-memory module variable, it is only
 * actually shared between `POST /api/cycle` and a GET route when both run
 * inside the *same* Node.js process with the *same* loaded module instance —
 * NOT reliably true in this project's stated Vercel serverless deployment,
 * where the routes commonly execute as separate function instances. Under
 * the old design that made the recompute path the common one in production,
 * meaning most reads served independently-pulled Binance data instead of
 * n8n's payload — the opposite of the single-source-of-truth requirement
 * this change enforces. §5 "no store retains reasoning state between
 * cycles" still holds: this cache is never read by the reasoning core
 * (L1-L4), only by the presentation read paths.
 */
interface CacheEntry {
  report: DecisionReport;
  expiresAt: Millis;
}

const entries = new Map<Market, CacheEntry>();

/** Stores `report` for `market`, valid until `atMs + ttlMs` (exclusive). */
export function put(market: Market, report: DecisionReport, ttlMs: Millis, atMs: Millis = Date.now()): void {
  entries.set(market, { report, expiresAt: atMs + ttlMs });
}

/** Returns `market`'s cached report if it exists and has not expired as of `atMs`, else `null`. */
export function get(market: Market, atMs: Millis = Date.now()): DecisionReport | null {
  const entry = entries.get(market);
  if (!entry) return null;
  if (atMs >= entry.expiresAt) return null;
  return entry.report;
}

/** Convenience lookup: this asset's Decision from `market`'s cached report, if fresh. */
export function getForAsset(market: Market, asset: Asset, atMs: Millis = Date.now()): Decision | null {
  const report = get(market, atMs);
  if (!report) return null;
  return report.decisions.find((d) => d.asset === asset) ?? null;
}

/** Test-only helper: clears every market's cache entry so tests do not leak state across cases. */
export function clear(): void {
  entries.clear();
}
