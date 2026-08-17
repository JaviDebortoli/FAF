import Anthropic from '@anthropic-ai/sdk';
import type { NarrativeFacts } from '@/src/narrative/facts';
import { NARRATIVE_SYSTEM_PROMPT, buildUserMessage } from '@/src/narrative/prompt';

/**
 * design.md "Claude call shape" — fixed, current model id. Do not append a
 * dated suffix or substitute a different model; this is a deliberate,
 * reviewed constant.
 */
const MODEL = 'claude-opus-5';

/**
 * Hard cap bounding thinking + visible output tokens for one call. With
 * adaptive thinking, `max_tokens` bounds BOTH; thinking tokens are spent
 * even at `output_config.effort: 'low'`, so this is sized with headroom
 * above the ~180-word (~250-token) narrative NARRATIVE_SYSTEM_PROMPT caps
 * the visible output at (design.md's own Open Questions flags 2000 as a
 * first estimate needing empirical adjustment — 4096 gives more thinking
 * headroom without materially changing the cost ceiling, since this route
 * is separately protected by src/narrative/rateLimit.ts, the (asset,t)
 * cache, and the Anthropic console spend cap, T-3).
 */
const MAX_TOKENS = 4096;

/**
 * Streams the narrative text for `facts`, yielding only forwarded
 * `text_delta` chunks. `thinking_delta` (and every other event/delta type)
 * is discarded here, server-side, and never reaches the caller — the
 * narrative route (PR2b) forwards exactly what this generator yields, so
 * "never stream thinking content to the client" is enforced at this single
 * seam (design.md's Claude call shape).
 *
 * The `Anthropic` client is constructed INSIDE this function body, never at
 * module scope (design.md threat T-5). Because this is an async generator,
 * the body — including `new Anthropic()` and the `messages.stream(...)`
 * call — does not run until the caller pulls the first value (the first
 * `.next()`/first loop iteration), not merely until this function is
 * *called*. A module-scope client would read `ANTHROPIC_API_KEY` at
 * cold-start even for requests that short-circuit before ever needing a
 * narrative (400/404/409 in the route), and would make key rotation and
 * SDK mocking in tests harder — this shape is what lets the route return a
 * clean `503 NARRATIVE_DISABLED` on a missing key instead of an
 * import-time crash, and lets tests assert zero Anthropic construction on
 * every non-LLM code path (tests/narrative/client.test.ts,
 * tests/api/narrative.test.ts).
 *
 * `output_config: { effort: 'low' }` — NARRATIVE_SYSTEM_PROMPT explicitly
 * instructs the model to only restate already-computed facts ("No calculas
 * ni decides nada"): a bounded, low-complexity restatement task, not
 * open-ended reasoning. This endpoint is also flagged in design.md's threat
 * matrix (T-3) as a public, cost-abuse-prone route, so minimizing
 * latency/cost/thinking-token spend on every call is the deliberate
 * default here.
 */
export async function* streamNarrative(facts: NarrativeFacts): AsyncGenerator<string> {
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: NARRATIVE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(facts) }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
