import * as cache from '@/src/cycle/latest';

/**
 * GET /api/decisions — the UI's read path. Push-only ingestion
 * (dynamic-asset-count design.md Supersession section): the only way this
 * route's data is ever produced is a `POST /api/cycle` call landing on
 * `src/cycle/latest.ts`'s module-scope cache. This route is a pure cache
 * read — it never calls `runCycle` or pulls candles itself. A cache miss
 * (nothing pushed yet, or the last push's TTL expired) returns a defined
 * `503 NO_DATA` with `Retry-After`, never a synthesized/recomputed report.
 *
 * The previously documented "cache-miss recomputes via pullAllAssets" path
 * (design.md's original D-B) is retired: the module-scope cache is not
 * reliably shared across Vercel function instances, so that recompute path
 * was in practice the common one, meaning most reads served
 * independently-pulled Binance data instead of n8n's payload. See
 * design.md's Supersession section for the full rationale.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(): Promise<Response> {
  const cached = cache.get();
  if (!cached) {
    return Response.json(
      { error: 'Service temporarily unavailable', code: 'NO_DATA' },
      { status: 503, headers: { 'Retry-After': '30' } },
    );
  }
  return Response.json(cached, { status: 200 });
}
