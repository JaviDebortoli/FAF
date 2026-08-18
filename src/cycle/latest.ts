import type { Asset, Decision, DecisionReport, Millis } from '@/src/domain/types';

/**
 * Module-scope cache (dynamic-asset-count design.md Supersession section):
 * holds the most recently POSTed `DecisionReport` (produced by one
 * `/api/cycle` call, which evaluates every asset n8n pushed together) for up
 * to `ttlMs` (matches beta, the 1h candle step).
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

let entry: CacheEntry | null = null;

/** Stores `report`, valid until `atMs + ttlMs` (exclusive). */
export function put(report: DecisionReport, ttlMs: Millis, atMs: Millis = Date.now()): void {
  entry = { report, expiresAt: atMs + ttlMs };
}

/** Returns the cached report if it exists and has not expired as of `atMs`, else `null`. */
export function get(atMs: Millis = Date.now()): DecisionReport | null {
  if (!entry) return null;
  if (atMs >= entry.expiresAt) return null;
  return entry.report;
}

/** Convenience lookup: this asset's Decision from the cached report, if fresh. */
export function getForAsset(asset: Asset, atMs: Millis = Date.now()): Decision | null {
  const report = get(atMs);
  if (!report) return null;
  return report.decisions.find((d) => d.asset === asset) ?? null;
}

/** Test-only helper: clears the cache so tests do not leak state across cases. */
export function clear(): void {
  entry = null;
}
