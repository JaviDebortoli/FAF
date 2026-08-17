import { BETA_MS } from '@/src/cycle/constants';
import type { Asset, Millis } from '@/src/domain/types';

/**
 * Cost-mitigation cache for a generated narrative, per `(asset, decision.t)`
 * — mirrors src/cycle/latest.ts's shape exactly (module-scope Map, explicit
 * TTL param defaulting to BETA_MS, atMs injectable for tests). decision.t is
 * derived from the data (runCycle's latestTimestamp), not the wall clock, so
 * the key is deterministic: a recomputed identical report reuses the same
 * narrative, and a NEW t for the same asset is always a fresh key — the old
 * entry never "leaks" into a request for a newer decision, independent of
 * whether the old entry is itself still within its own TTL.
 *
 * Bounded to MAX_ENTRIES with oldest-inserted eviction (JS Map preserves
 * insertion order) so a long-lived instance cannot grow unbounded.
 *
 * The write surface is deliberately a single atomic `put(text)` accepting
 * one complete string — there is no partial/streaming write API. Only a
 * cleanly completed narrative may ever be passed to `put` (design.md
 * "Caching": "R->>NC: put(full text) only on clean completion" — enforced
 * by the caller, the narrative route, which must never call `put` on an
 * aborted/partial stream).
 *
 * IMPORTANT — same caveat as src/cycle/latest.ts's "Cache sharing in the
 * stated Vercel deployment" note: this is a plain module-scope variable, so
 * on Vercel it is per-instance. A second drill-down on the same asset
 * frequently lands on a cold instance and pays for a second generation.
 * This cache is a cost REDUCTION, never a cost CEILING, and MUST NOT be
 * counted as the abuse control (see design.md's T-3 threat entry —
 * src/narrative/rateLimit.ts and the Anthropic console spend cap are that).
 */
const MAX_ENTRIES = 16;

interface CacheEntry {
  text: string;
  expiresAt: Millis;
}

const entries = new Map<string, CacheEntry>();

function keyFor(asset: Asset, t: Millis): string {
  return `${asset}:${t}`;
}

/** Stores `text` for `(asset, t)`, valid until `atMs + ttlMs` (exclusive). */
export function put(asset: Asset, t: Millis, text: string, ttlMs: Millis = BETA_MS, atMs: Millis = Date.now()): void {
  const key = keyFor(asset, t);
  if (!entries.has(key) && entries.size >= MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value;
    if (oldestKey !== undefined) entries.delete(oldestKey);
  }
  entries.set(key, { text, expiresAt: atMs + ttlMs });
}

/** Returns the cached narrative for `(asset, t)` if fresh as of `atMs`, else `null`. */
export function get(asset: Asset, t: Millis, atMs: Millis = Date.now()): string | null {
  const entry = entries.get(keyFor(asset, t));
  if (!entry) return null;
  if (atMs >= entry.expiresAt) return null;
  return entry.text;
}

/** Test-only helper: clears the cache so tests do not leak state across cases. */
export function clear(): void {
  entries.clear();
}
