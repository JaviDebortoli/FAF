import type { Candle } from '@/src/domain/types';
import { ASSET_ALLOWLIST, isAllowedAsset } from '@/src/market/assets';
import { runCycle } from '@/src/cycle/runCycle';
import type { AssetKlines } from '@/src/cycle/runCycle';
import { pullAllAssets } from '@/src/cycle/pullAssets';
import * as cache from '@/src/cycle/latest';
import { BETA_MS } from '@/src/cycle/constants';

/**
 * POST /api/cycle — n8n's trigger endpoint (design.md sequence (a), D-C: one
 * ingestion route, two data sources). Runtime constraints per design.md's
 * Deployment decision: real network I/O (Binance pull path), so this must
 * NOT run on the Edge runtime, and must not be statically optimized/cached.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Header carrying the shared secret (T-2, design.md Threat Matrix). */
const SHARED_SECRET_HEADER = 'x-faf-shared-secret';

/** Hard caps bounding payload size (T-1) — generous relative to the v1
 * allowlist (3 assets, 50 candles/asset in normal operation) but well below
 * anything that could be used to exhaust server memory/CPU. */
const MAX_ASSETS = ASSET_ALLOWLIST.length;
const MAX_KLINES_PER_ASSET = 500;
const MAX_BODY_BYTES = 1_000_000; // 1 MB

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidCandle(v: unknown): v is Candle {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    isFiniteNumber(c.openTime) &&
    isFiniteNumber(c.open) &&
    isFiniteNumber(c.high) &&
    isFiniteNumber(c.low) &&
    isFiniteNumber(c.close) &&
    isFiniteNumber(c.volume)
  );
}

export type ParsedCyclePayload =
  | { ok: true; assets: AssetKlines[] }
  | { ok: false; error: string };

/**
 * T-1: validates the pushed-klines payload shape AND rejects any symbol not
 * in `src/market/assets.ts`'s allowlist, before any downstream processing.
 */
export function parseCyclePayload(body: unknown): ParsedCyclePayload {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Payload must be a JSON object' };
  }
  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.assets)) {
    return { ok: false, error: '"assets" must be an array' };
  }
  if (raw.assets.length === 0 || raw.assets.length > MAX_ASSETS) {
    return { ok: false, error: `"assets" length must be between 1 and ${MAX_ASSETS}` };
  }

  const assets: AssetKlines[] = [];
  for (const rawEntry of raw.assets) {
    if (typeof rawEntry !== 'object' || rawEntry === null) {
      return { ok: false, error: 'Each assets[] entry must be an object' };
    }
    const { symbol, klines } = rawEntry as Record<string, unknown>;
    if (typeof symbol !== 'string' || !isAllowedAsset(symbol)) {
      return { ok: false, error: `Unknown or disallowed symbol: ${String(symbol)}` };
    }
    if (!Array.isArray(klines) || klines.length > MAX_KLINES_PER_ASSET) {
      return {
        ok: false,
        error: `"klines" for ${symbol} must be an array of at most ${MAX_KLINES_PER_ASSET} candles`,
      };
    }
    if (!klines.every(isValidCandle)) {
      return { ok: false, error: `"klines" for ${symbol} contains malformed candle entries` };
    }
    assets.push({ asset: symbol, candles: klines });
  }

  return { ok: true, assets };
}

/** T-2: shared-secret check via `FAF_CYCLE_SHARED_SECRET` (never hardcoded). */
export function checkSharedSecret(request: Request): { ok: true } | { ok: false; status: 401 | 403 } {
  const provided = request.headers.get(SHARED_SECRET_HEADER);
  if (!provided) return { ok: false, status: 401 };
  const expected = process.env.FAF_CYCLE_SHARED_SECRET;
  if (!expected || provided !== expected) return { ok: false, status: 403 };
  return { ok: true };
}

export async function POST(request: Request): Promise<Response> {
  const auth = checkSharedSecret(request);
  if (!auth.ok) {
    return Response.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const text = await request.text();

  if (text.trim().length === 0) {
    // Empty body (D-C): pull-mode, server fetches every allowlisted asset itself.
    const assets = await pullAllAssets();
    const report = runCycle(assets);
    cache.put(report, BETA_MS);
    return Response.json(report, { status: 200 });
  }

  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large' }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(text);
  } catch {
    return Response.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const parsed = parseCyclePayload(rawBody);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const report = runCycle(parsed.assets);
  cache.put(report, BETA_MS);
  return Response.json(report, { status: 200 });
}
