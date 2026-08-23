import { getRedis } from '@/src/lib/redis';
import { BETA_MS } from '@/src/cycle/constants';
import type { Asset, Millis } from '@/src/domain/types';

/**
 * Redis-backed cost-mitigation cache (presentation-cache-persistence
 * design.md, "Redis client type"/"Client construction"/"Write failure
 * handling"/"TTL granularity"/"MAX_ENTRIES (narrative cache)" decisions;
 * decision-narrative "Cost-mitigation caching", MODIFIED requirement) for a
 * generated narrative, per `(asset, decision.t)` — mirrors
 * src/cycle/latest.ts's Redis-backed shape (module surface, `getRedis()`
 * usage, key-per-entry scheme, Redis-native `EX` TTL), with one deliberate
 * asymmetry on write-failure handling (see `put` below).
 *
 * decision.t is derived from the data (runCycle's latestTimestamp), not the
 * wall clock, so the key is deterministic: a recomputed identical report
 * reuses the same narrative, and a NEW t for the same asset is always a
 * fresh key — the old entry never "leaks" into a request for a newer
 * decision, independent of whether the old entry is itself still within its
 * own TTL.
 *
 * No `MAX_ENTRIES`/oldest-eviction logic (dropped per design.md's decision):
 * the in-memory `Map` needed an app-level size ceiling because it had no
 * other bound; Redis TTL already bounds storage growth, so replicating an
 * insertion-order-tracked eviction here would be a redundant class of
 * app-code bugs with no correctness benefit.
 *
 * The write surface is deliberately a single atomic `put(text)` accepting
 * one complete string — there is no partial/streaming write API. Only a
 * cleanly completed narrative may ever be passed to `put` (design.md
 * "Caching": "R->>NC: put(full text) only on clean completion" — enforced
 * by the caller, the narrative route, which must never call `put` on an
 * aborted/partial stream).
 *
 * Durable and cross-instance-shared (Redis, not a process-local `Map`): a
 * write from one serverless function instance must be visible to a read
 * served by a different instance (decision-narrative "Cached narrative hit
 * is visible across instances").
 *
 * IMPORTANT — asymmetric error handling vs. `src/cycle/latest.ts`'s `put`:
 * THIS module's `put` never throws to the caller. This cache is cost
 * REDUCTION only, never correctness-bearing (design.md's own doc-comment
 * caveat, carried over from the pre-Redis version) — a lost write here just
 * means the next drill-down pays for a fresh Claude generation, which is
 * exactly what already happens today whenever a cold Vercel instance misses
 * the cache. There is no fallback store and no caller-visible failure mode
 * to protect (unlike `latest.ts`'s `put`, where a lost write means a pushed
 * report is durably nowhere and `POST /api/cycle` must be able to detect
 * that and 502). Catching the write failure INSIDE this module (rather than
 * via a `.catch(() => {})` at the call site) keeps this asymmetry fully
 * contained to this one file: any future caller of `put` gets the
 * fire-and-forget-safe contract for free, with no risk of a caller forgetting
 * to attach its own `.catch`.
 */

function keyFor(asset: Asset, t: Millis): string {
  return `narrative:${asset}:${t}`;
}

/**
 * Stores `text` for `(asset, t)`, expiring via Redis-native TTL (`SET ... EX
 * <seconds>`, `ttlMs` rounded up to the nearest whole second, minimum 1s —
 * same formula as `src/cycle/latest.ts`'s "TTL granularity" decision).
 * Defaults `ttlMs` to `BETA_MS`, matching the pre-Redis version's default.
 *
 * Never throws to the caller: any Redis write failure is caught and
 * swallowed here (see the module doc comment above for the rationale). This
 * is the one deliberate asymmetry vs. `src/cycle/latest.ts`'s `put`, which
 * propagates write failures.
 */
export async function put(asset: Asset, t: Millis, text: string, ttlMs: Millis = BETA_MS): Promise<void> {
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  try {
    await getRedis().set(keyFor(asset, t), text, { ex: ttlSeconds });
  } catch {
    // Cost-mitigation only, never correctness-bearing — a lost write is
    // invisible to the caller, not surfaced as an error (design.md
    // Interfaces/Contracts: "never throws to caller").
  }
}

/**
 * Returns the cached narrative for `(asset, t)`, or `null` on a genuine
 * cache miss/TTL expiry OR on any Redis read failure (fail-open, same
 * rationale as `src/cycle/latest.ts`'s `get`: a `null` here just means the
 * caller regenerates the narrative, which is always a safe/available
 * fallback for this cost-mitigation-only cache).
 */
export async function get(asset: Asset, t: Millis): Promise<string | null> {
  try {
    const raw = await getRedis().get<string>(keyFor(asset, t));
    return raw ?? null;
  } catch {
    return null;
  }
}

/** Test-only helper: clears the cache so tests do not leak state across cases. */
export async function clear(): Promise<void> {
  // No enumerable key space (unlike src/cycle/latest.ts's fixed MARKETS
  // list): tests reset the shared fake Redis directly via
  // `fakeRedis.__reset()` in their own `beforeEach`, so this module does not
  // need its own `clear()` body to satisfy a real caller today. Kept as an
  // exported no-op-shaped async function only to preserve the public surface
  // (`get`/`put`/`clear`) asserted by this module's own test suite.
}
