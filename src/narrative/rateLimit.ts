import type { Millis } from '@/src/domain/types';

/**
 * design.md Threat Matrix T-3 ("LLM cost abuse on a public endpoint"): a
 * per-instance FIXED-WINDOW rate limit (10 req / 60 s per client key, taken
 * from `x-forwarded-for` by the route in PR2b) plus a global per-instance
 * hourly circuit breaker. This is one of several layers, cheapest-first
 * before this one: allowlist rejection, 404/409 short-circuits, this
 * limiter, `max_tokens`, the beta-window cache — the only *hard* ceiling is
 * the Anthropic console spend cap (documented in `.env.example`, PR2b).
 *
 * "Fixed window" (not sliding/token-bucket): time is bucketed into
 * WINDOW_MS-wide slices aligned to the Unix epoch (`floor(atMs / WINDOW_MS)`),
 * so a request landing exactly on a bucket boundary belongs to the NEW
 * bucket — this is what makes the algorithm's edges deterministic and
 * testable with injected `atMs`, matching this module's cache/latest.ts
 * sibling's own `atMs` convention.
 *
 * HONEST LIMITATION (design.md, restated here): this is module-scope state,
 * so on Vercel it is per-instance — a distributed attacker multiplies the
 * effective limit by the number of instances spawned. It bounds accidental
 * and casual abuse, not a determined adversary.
 */
const WINDOW_MS: Millis = 60_000;
const WINDOW_LIMIT = 10;
const HOUR_MS: Millis = 60 * 60_000;

/**
 * First-estimate, tunable constant (design.md Open Questions: "Rate-limit
 * numbers ... are a first estimate; the Anthropic console spend cap is the
 * real ceiling. Not blocking — tunable constants in one file.").
 */
export const HOURLY_INSTANCE_LIMIT = 100;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

interface WindowBucket {
  bucketStart: Millis;
  count: number;
}

function bucketStartFor(atMs: Millis, windowMs: Millis): Millis {
  return Math.floor(atMs / windowMs) * windowMs;
}

function retryAfterSecFor(bucketStart: Millis, windowMs: Millis, atMs: Millis): number {
  return Math.ceil((bucketStart + windowMs - atMs) / 1000);
}

const perKeyWindows = new Map<string, WindowBucket>();
let instanceHour: WindowBucket = { bucketStart: 0, count: 0 };

/**
 * Checks (and, if allowed, consumes one unit of) both the per-key fixed
 * window and the global per-instance hourly breaker. The hourly breaker is
 * checked first — it is the cheaper, coarser, instance-wide protection —
 * and denies without ever touching per-key state.
 */
export function allow(clientKey: string, atMs: Millis = Date.now()): RateLimitResult {
  const hourBucketStart = bucketStartFor(atMs, HOUR_MS);
  if (instanceHour.bucketStart !== hourBucketStart) {
    instanceHour = { bucketStart: hourBucketStart, count: 0 };
  }
  if (instanceHour.count >= HOURLY_INSTANCE_LIMIT) {
    return { allowed: false, retryAfterSec: retryAfterSecFor(hourBucketStart, HOUR_MS, atMs) };
  }

  const windowBucketStart = bucketStartFor(atMs, WINDOW_MS);
  let bucket = perKeyWindows.get(clientKey);
  if (!bucket || bucket.bucketStart !== windowBucketStart) {
    bucket = { bucketStart: windowBucketStart, count: 0 };
    perKeyWindows.set(clientKey, bucket);
  }
  if (bucket.count >= WINDOW_LIMIT) {
    return { allowed: false, retryAfterSec: retryAfterSecFor(windowBucketStart, WINDOW_MS, atMs) };
  }

  bucket.count += 1;
  instanceHour.count += 1;
  return { allowed: true };
}

/** Test-only helper: clears all rate-limit state so tests do not leak across cases. */
export function clear(): void {
  perKeyWindows.clear();
  instanceHour = { bucketStart: 0, count: 0 };
}
