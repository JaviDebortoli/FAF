import { runCycle } from '@/src/cycle/runCycle';
import { pullAllAssets } from '@/src/cycle/pullAssets';
import * as cache from '@/src/cycle/latest';
import { BETA_MS } from '@/src/cycle/constants';

/**
 * GET /api/decisions — the UI's read path (design.md D-B). Serves the
 * cached report if still younger than beta; otherwise recomputes on demand
 * by pulling klines itself via the same `pullAllAssets` path `/api/cycle`'s
 * pull-mode uses. Correctness never depends on the cache: `runCycle` is a
 * pure function of its input candles, so a cache-miss recompute against the
 * same underlying data always returns byte-equal decisions to a cache hit
 * (tests/api/decisions.test.ts).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(): Promise<Response> {
  const cached = cache.get();
  if (cached) {
    return Response.json(cached, { status: 200 });
  }

  const assets = await pullAllAssets();
  const report = runCycle(assets);
  cache.put(report, BETA_MS);
  return Response.json(report, { status: 200 });
}
