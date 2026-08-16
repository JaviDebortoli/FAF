import type { Asset, Decision, DecisionReport, Millis } from '@/src/domain/types';

/**
 * Module-scope, presentation-latency-only cache (design.md D-B): holds the
 * most recently POSTed `DecisionReport` (produced by one `/api/cycle` call,
 * which evaluates every pushed/pulled asset together) for up to `ttlMs`
 * (matches beta, the 1h candle step).
 *
 * `runCycle` is a pure function of its input candles (no wall-clock reads),
 * so a cache MISS never changes the answer — it only costs a recompute.
 * Nothing here is load-bearing for correctness; §5 "no store retains
 * reasoning state between cycles" still holds, since this cache is never
 * read by the reasoning core (L1-L4), only by the presentation read path
 * (`GET /api/decisions`).
 *
 * IMPORTANT — this is a plain in-memory module variable, so it is only
 * actually shared between `POST /api/cycle` and `GET /api/decisions` when
 * both run inside the *same* Node.js process with the *same* loaded module
 * instance. That is NOT reliably true even in this project's own stated
 * production deployment (Vercel serverless): the two routes commonly execute
 * as separate function instances there too, not only in local Next.js dev
 * mode. See design.md's "Cache sharing in the stated Vercel deployment"
 * note — this is a latency/API-call-cost consequence, not a correctness
 * issue (a cache miss always recomputes a byte-identical report).
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
