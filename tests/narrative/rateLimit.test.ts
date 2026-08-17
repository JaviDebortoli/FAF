import { beforeEach, describe, expect, it } from 'vitest';
import * as rateLimit from '@/src/narrative/rateLimit';

// design.md Threat Matrix T-3: "per-instance fixed-window rate limit (10
// req / 60 s per client key from x-forwarded-for), plus a global
// per-instance hourly circuit breaker in src/narrative/rateLimit.ts". Fixed
// window (not sliding/token-bucket): time is bucketed into WINDOW_MS-wide
// slices aligned to the epoch, so a request landing exactly on a bucket
// boundary belongs to the NEW bucket, not the old one — tested explicitly
// below as the window-boundary edge case.

const WINDOW_MS = 60_000;
const HOUR_MS = 60 * 60_000;

beforeEach(() => {
  rateLimit.clear();
});

describe('rateLimit.allow — fixed window, 10 req/60s per client key', () => {
  it('allows the first 10 requests within a window for one client key', () => {
    for (let i = 0; i < 10; i += 1) {
      expect(rateLimit.allow('client-a', 0).allowed).toBe(true);
    }
  });

  it('denies the 11th request (N+1) within the same window', () => {
    for (let i = 0; i < 10; i += 1) {
      rateLimit.allow('client-a', 0);
    }

    const result = rateLimit.allow('client-a', 0);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it('tracks each client key independently — a second key is unaffected by the first key exhausting its window', () => {
    for (let i = 0; i < 10; i += 1) {
      rateLimit.allow('client-a', 0);
    }
    expect(rateLimit.allow('client-a', 0).allowed).toBe(false);

    expect(rateLimit.allow('client-b', 0).allowed).toBe(true);
  });

  it('resets the count once the fixed window rolls over (a later timestamp in a new bucket is allowed again)', () => {
    for (let i = 0; i < 10; i += 1) {
      rateLimit.allow('client-a', 0);
    }
    expect(rateLimit.allow('client-a', WINDOW_MS - 1).allowed).toBe(false); // still same bucket

    expect(rateLimit.allow('client-a', WINDOW_MS * 3).allowed).toBe(true); // well into a later bucket
  });

  it('window-boundary edge case: a request exactly at the window-reset instant is treated as a NEW window', () => {
    for (let i = 0; i < 10; i += 1) {
      rateLimit.allow('client-a', 0);
    }
    expect(rateLimit.allow('client-a', WINDOW_MS).allowed).toBe(true); // t = WINDOW_MS exactly => new bucket
  });

  it('retryAfterSec counts down to the next window boundary, not a fixed constant', () => {
    for (let i = 0; i < 10; i += 1) {
      rateLimit.allow('client-a', 0);
    }

    const earlyDeny = rateLimit.allow('client-a', 1_000);
    const lateDeny = rateLimit.allow('client-a', 50_000);

    expect(earlyDeny.retryAfterSec).toBeGreaterThan(lateDeny.retryAfterSec ?? 0);
  });
});

describe('rateLimit.allow — hourly per-instance circuit breaker', () => {
  it('denies further requests once the hourly instance-wide cap is reached, even across many distinct client keys', () => {
    const HOURLY_LIMIT = rateLimit.HOURLY_INSTANCE_LIMIT;

    let allowedCount = 0;
    for (let i = 0; i < HOURLY_LIMIT; i += 1) {
      // Spread across many distinct keys, each well under its own 10/60s cap,
      // to prove the breaker is a GLOBAL instance-wide ceiling, not per-key.
      const key = `client-${i % (HOURLY_LIMIT + 5)}`;
      const result = rateLimit.allow(key, i * 100);
      if (result.allowed) allowedCount += 1;
    }
    expect(allowedCount).toBe(HOURLY_LIMIT);

    const overCap = rateLimit.allow('client-fresh-key', HOURLY_LIMIT * 100);
    expect(overCap.allowed).toBe(false);
    expect(overCap.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets the hourly breaker once the hour window rolls over', () => {
    const HOURLY_LIMIT = rateLimit.HOURLY_INSTANCE_LIMIT;
    for (let i = 0; i < HOURLY_LIMIT; i += 1) {
      rateLimit.allow(`client-${i}`, 0);
    }
    expect(rateLimit.allow('client-over-cap', 0).allowed).toBe(false);

    expect(rateLimit.allow('client-new-hour', HOUR_MS).allowed).toBe(true);
  });
});

describe('rateLimit.clear', () => {
  it('resets both the per-key window state and the hourly breaker', () => {
    for (let i = 0; i < 10; i += 1) {
      rateLimit.allow('client-a', 0);
    }
    expect(rateLimit.allow('client-a', 0).allowed).toBe(false);

    rateLimit.clear();

    expect(rateLimit.allow('client-a', 0).allowed).toBe(true);
  });
});
