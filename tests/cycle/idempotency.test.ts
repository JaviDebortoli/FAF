import { describe, expect, it } from 'vitest';
import { runCycle } from '@/src/cycle/runCycle';
import candles from '../fixtures/paper-example/candles.json';
import type { Candle } from '@/src/domain/types';

// Codifies design.md's D-B decision explicitly: n8n polls every 1-5 minutes
// against 1h candles, so most cycles run against the SAME in-progress
// candle set. runCycle MUST therefore be idempotent for byte-identical
// input — recompute is always safe, by construction, because runCycle
// reads no wall clock and derives every output timestamp from the input
// candles themselves (see src/cycle/runCycle.ts's `latestTimestamp` /
// `computeCycleId`). This is the property that makes the presentation-only
// cache in src/cycle/latest.ts (task 6.2) safe: a cache MISS never changes
// the answer, only the latency. See docs/architecture-notes.md for the
// full rationale (chosen over aligning n8n's cron cadence to candle-close
// boundaries).

describe('runCycle idempotency (design.md D-B)', () => {
  it('produces a byte-identical DecisionReport for two calls with identical input klines', () => {
    const input = [{ asset: 'BTCUSDT', candles: candles as Candle[] }];

    const reportA = runCycle(input);
    const reportB = runCycle(input);

    expect(JSON.stringify(reportA)).toBe(JSON.stringify(reportB));
  });

  it('is byte-identical even across two SEPARATE (structurally equal, not same-reference) input arrays', () => {
    // Simulates two separate n8n cron ticks pushing the same in-progress
    // hourly candle set as two distinct payload objects (not the same
    // in-memory reference) — the realistic cross-request scenario.
    const inputA = [{ asset: 'BTCUSDT', candles: JSON.parse(JSON.stringify(candles)) as Candle[] }];
    const inputB = [{ asset: 'BTCUSDT', candles: JSON.parse(JSON.stringify(candles)) as Candle[] }];

    const reportA = runCycle(inputA);
    const reportB = runCycle(inputB);

    expect(JSON.stringify(reportA)).toBe(JSON.stringify(reportB));
  });

  it('multi-asset cycles are idempotent per-asset and independently of asset order', () => {
    const btc = { asset: 'BTCUSDT', candles: candles as Candle[] };
    // A second asset with insufficient history still produces a
    // (NO_RECOMMENDATION) decision deterministically, not a thrown error.
    const eth = { asset: 'ETHUSDT', candles: (candles as Candle[]).slice(0, 5) };

    const reportA = runCycle([btc, eth]);
    const reportB = runCycle([eth, btc]);

    const decisionsA = [...reportA.decisions].sort((a, b) => a.asset.localeCompare(b.asset));
    const decisionsB = [...reportB.decisions].sort((a, b) => a.asset.localeCompare(b.asset));
    expect(JSON.stringify(decisionsA)).toBe(JSON.stringify(decisionsB));
  });
});
