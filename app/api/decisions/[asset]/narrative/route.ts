import Anthropic from '@anthropic-ai/sdk';
import type { AllowedAsset } from '@/src/market/assets';
import { isAllowedAsset } from '@/src/market/assets';
import type { Decision } from '@/src/domain/types';
import { runCycle } from '@/src/cycle/runCycle';
import { pullAllAssets } from '@/src/cycle/pullAssets';
import * as cycleCache from '@/src/cycle/latest';
import { BETA_MS } from '@/src/cycle/constants';
import { buildNarrativeFacts } from '@/src/narrative/facts';
import { streamNarrative } from '@/src/narrative/client';
import * as narrativeCache from '@/src/narrative/cache';
import * as rateLimit from '@/src/narrative/rateLimit';

/**
 * GET /api/decisions/[asset]/narrative — design.md "Narrative Endpoint
 * Contract". Streams a lazily-generated, presentation-only LLM narrative
 * for one asset's current decision (D7). Matches the runtime/deploy
 * constraints of the existing `app/api/*` routes (Claude call = real
 * network I/O, so Edge runtime is not an option here either).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * T-6: once the first byte ships, the HTTP status is committed, so a hung
 * upstream cannot be turned into a clean error response any more — the only
 * remaining move is to stop the stream deterministically. 45s leaves margin
 * under `maxDuration=60`.
 */
const STREAM_DEADLINE_MS = 45_000;

const INCOMPLETE_MARKER = '\n\n[NARRATIVE_INCOMPLETE]';

type ErrorCode =
  | 'BAD_ASSET'
  | 'NO_DECISION'
  | 'NOT_APPLICABLE'
  | 'RATE_LIMITED'
  | 'NARRATIVE_DISABLED'
  | 'UPSTREAM_BUSY'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL';

function jsonError(status: number, code: ErrorCode, message: string, headers?: Record<string, string>): Response {
  return Response.json({ error: message, code }, { status, headers });
}

/**
 * design.md sequence diagram: `getForAsset(asset) or pull+runCycle+put`,
 * the same data-acquisition path `GET /api/decisions` uses — the narrative
 * is grounded in server-computed data by construction (T-4: the client
 * never supplies the Decision). If a report is already cached (fresh) but
 * simply does not contain this asset (e.g. a zero-candle fetch that cycle),
 * that is treated as a genuine "no Decision" rather than triggering another
 * recompute — mirrors `src/cycle/latest.ts#getForAsset`'s own semantics.
 */
async function getDecisionForAsset(asset: AllowedAsset): Promise<Decision | null> {
  const cachedDecision = cycleCache.getForAsset(asset);
  if (cachedDecision) return cachedDecision;

  const cachedReport = cycleCache.get();
  if (cachedReport) return null;

  const assets = await pullAllAssets();
  const report = runCycle(assets);
  cycleCache.put(report, BETA_MS);
  return report.decisions.find((d) => d.asset === asset) ?? null;
}

/** T-3: rate-limit client key, taken from the standard forwarded-for header. */
function clientKeyFor(request: Request): string {
  return request.headers.get('x-forwarded-for') ?? 'unknown';
}

/**
 * Classification uses typed SDK exceptions ONLY, most-specific-first, never
 * message-string matching (design.md's Failure taxonomy). Upstream error
 * bodies/messages are never echoed in the response (T-5) — every branch
 * below returns a static, our-own message string.
 */
function anthropicErrorResponse(err: unknown): Response {
  if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.APIConnectionError) {
    return jsonError(503, 'UPSTREAM_BUSY', 'Upstream Claude API is busy, try again shortly');
  }
  if (err instanceof Anthropic.APIError) {
    return jsonError(502, 'UPSTREAM_ERROR', 'Upstream Claude API returned an error');
  }
  return jsonError(500, 'INTERNAL', 'Unexpected error generating the narrative');
}

/**
 * Drives `generator` to completion (or to the 45s deadline / a mid-stream
 * throw), enqueuing every forwarded chunk as it arrives. `first` is the
 * already-resolved first iterator result (the caller must pull it before
 * committing to a 200 response, see GET below).
 *
 * Only a CLEAN completion (`completedCleanly`) is ever handed to `onDone`
 * for caching — matches src/narrative/cache.ts's "only clean completions
 * are ever stored" contract and T-6's "the cache is not written" rule.
 */
function buildNarrativeStream(
  generator: AsyncGenerator<string>,
  first: IteratorResult<string>,
  onDone: (fullText: string, completedCleanly: boolean) => void,
  deadlineMs: number = STREAM_DEADLINE_MS,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = '';
      const deadlineAt = Date.now() + deadlineMs;

      function emit(text: string): void {
        fullText += text;
        controller.enqueue(encoder.encode(text));
      }

      let completedCleanly: boolean;

      if (first.done) {
        completedCleanly = true;
      } else {
        emit(first.value);
        completedCleanly = false;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const remaining = deadlineAt - Date.now();
          if (remaining <= 0) break;

          let timer: ReturnType<typeof setTimeout>;
          const timeoutPromise = new Promise<'timeout'>((resolve) => {
            timer = setTimeout(() => resolve('timeout'), remaining);
          });

          let next: IteratorResult<string> | 'timeout';
          try {
            next = await Promise.race([generator.next(), timeoutPromise]);
          } catch {
            clearTimeout(timer!);
            break;
          }
          clearTimeout(timer!);

          if (next === 'timeout') break;
          if (next.done) {
            completedCleanly = true;
            break;
          }
          emit(next.value);
        }
      }

      if (!completedCleanly) {
        controller.enqueue(encoder.encode(INCOMPLETE_MARKER));
      }

      onDone(fullText, completedCleanly);
      controller.close();
    },
  });
}

function textStreamResponse(body: ReadableStream<Uint8Array>, source: 'cache' | 'llm'): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-faf-narrative-source': source,
    },
  });
}

function textResponse(text: string, source: 'cache' | 'llm'): Response {
  return new Response(text, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-faf-narrative-source': source,
    },
  });
}

/**
 * Next 15: the dynamic segment is a Promise and must be awaited. The route
 * ignores the request body and query string entirely (T-4) — the only
 * input is the `[asset]` path segment, validated against the allowlist.
 */
export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }): Promise<Response> {
  const { asset } = await params;

  if (!isAllowedAsset(asset)) {
    return jsonError(400, 'BAD_ASSET', `Unknown or disallowed symbol: ${asset}`);
  }

  const rl = rateLimit.allow(clientKeyFor(request));
  if (!rl.allowed) {
    return jsonError(429, 'RATE_LIMITED', 'Rate limit exceeded', {
      'Retry-After': String(rl.retryAfterSec ?? 60),
    });
  }

  const decision = await getDecisionForAsset(asset);
  if (!decision) {
    return jsonError(404, 'NO_DECISION', `No decision available for ${asset} this cycle`);
  }

  if (decision.recommendation === 'NO_RECOMMENDATION') {
    return jsonError(409, 'NOT_APPLICABLE', 'No active recommendation for this asset');
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(503, 'NARRATIVE_DISABLED', 'Narrative generation is not configured');
  }

  const cached = narrativeCache.get(asset, decision.t);
  if (cached !== null) {
    return textResponse(cached, 'cache');
  }

  const facts = buildNarrativeFacts(decision);
  const generator = streamNarrative(facts);

  let first: IteratorResult<string>;
  try {
    first = await generator.next();
  } catch (err) {
    return anthropicErrorResponse(err);
  }

  const body = buildNarrativeStream(generator, first, (fullText, completedCleanly) => {
    if (completedCleanly) {
      narrativeCache.put(asset, decision.t, fullText);
    }
  });

  return textStreamResponse(body, 'llm');
}
