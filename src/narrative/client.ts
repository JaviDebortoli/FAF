import Anthropic from '@anthropic-ai/sdk';
import type { NarrativeFacts } from '@/src/narrative/facts';
import { NARRATIVE_SYSTEM_PROMPT, buildUserMessage } from '@/src/narrative/prompt';

/**
 * design.md "Claude call shape" — fixed, current model id. Haiku 4.5, not
 * Opus 5: the task is bounded restatement (NARRATIVE_SYSTEM_PROMPT: "No
 * calculas ni decides nada"), not synthesis, so the cheaper tier is
 * sufficient and ~5x lower cost per call. Do not append a dated suffix or
 * substitute a different model; this is a deliberate, reviewed constant —
 * verify against the live API before changing it.
 */
const MODEL = 'claude-haiku-4-5';

/**
 * Hard cap on visible output tokens for one call. No `thinking` param is
 * sent (see below), so this bounds only the narrative text itself; the
 * ~180-word (~250-token) ceiling NARRATIVE_SYSTEM_PROMPT enforces leaves
 * ample headroom. Unchanged from the prior Opus-5 sizing — billing is by
 * tokens actually generated, not this cap, so there is no cost reason to
 * lower it; this route is separately protected by
 * src/narrative/rateLimit.ts, the (asset,t) cache, and the Anthropic
 * console spend cap, T-3.
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
 * No `output_config` and no `thinking` param: Haiku 4.5 does not support
 * `output_config.effort` (Opus/Sonnet-tier param — errors if sent), and
 * `thinking` is omitted rather than replaced with classic
 * `{ type: 'enabled', budget_tokens: N }` because this is a bounded
 * restatement task with no synthesis step thinking would improve — see
 * this change's design.md, which supersedes the archived
 * dashboard-ux design.md's Opus-5+adaptive-thinking rationale
 * ("non-trivial synthesis over the label algebra"), a rationale already in
 * tension with NARRATIVE_SYSTEM_PROMPT's own "No calculas ni decides nada"
 * framing. Reversible: classic thinking can be added later if the
 * manual-verification gate finds a quality regression.
 */
export async function* streamNarrative(facts: NarrativeFacts): AsyncGenerator<string> {
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: NARRATIVE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(facts) }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
