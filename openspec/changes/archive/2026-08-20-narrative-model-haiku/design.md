# Design: Swap Tier 2 Narrative Model from Claude Opus 5 to Haiku 4.5

> **Supersedes**: `openspec/changes/archive/2026-08-17-dashboard-ux/design.md` §"Claude call
> shape" (`model: 'claude-opus-5'`, `thinking: { type: 'adaptive' }`, rationale "non-trivial
> synthesis over the label algebra"). That file is an audit-trail artifact and is **not edited**;
> this document is the current source of truth for the call shape going forward. The archived
> rationale was already in tension with `NARRATIVE_SYSTEM_PROMPT`'s own framing ("No calculas ni
> decides nada: tu única tarea es traducir a lenguaje natural los datos que se te entregan") — the
> cost-reduction goal is the trigger to resolve that tension, not to introduce a new one.

## Technical Approach

Single-seam change: `src/narrative/client.ts` is the only place the Anthropic SDK is called for
the narrative feature (per the original design's T-5 isolation — client constructed lazily inside
the async generator body, never at module scope). No architecture, routing, caching, or error-
handling change. Swap `MODEL` to `claude-haiku-4-5`, drop the two Opus-5-specific params that
Haiku 4.5 does not support, and update the one test asserting the call shape.

## Architecture Decisions

### Decision: Drop `thinking` entirely (no `adaptive`, no classic `{enabled, budget_tokens}`)

| Option | Tradeoff | Decision |
|---|---|---|
| Keep `thinking: { type: 'adaptive' }` | Unsupported by Haiku 4.5 — API error, breaks the feature | Rejected |
| Classic `thinking: { type: 'enabled', budget_tokens: N }` | Reversible fallback if quality regresses; adds `budget_tokens` sizing complexity (`≥1024`, `< max_tokens`) and bills thinking tokens as output at Haiku's $5/1M rate, working against the cost goal | Rejected for now |
| Omit `thinking` entirely | Documented Anthropic default for this tier ("only if explicitly requested"); matches the prompt's own bounded-restatement framing; strictly cheaper | **Chosen** |

Rationale: the task has no synthesis step thinking would improve — `NARRATIVE_SYSTEM_PROMPT`
explicitly forbids the model from calculating or deciding anything. Reversible: if the manual-
verification gate (spec.md) finds a quality regression, classic thinking can be added in a
follow-up change once there's concrete evidence, not speculatively now.

### Decision: Remove `output_config: { effort: 'low' }` without replacement

**Choice**: Omit `output_config` entirely — it is an Opus/Sonnet-tier param not supported by
Haiku 4.5 and would error if left in.
**Alternatives considered**: None — this param has no Haiku 4.5 equivalent to substitute.
**Rationale**: Haiku is already the "fast/cheap" tier; `effort` tuning exists to trade cost/latency
within larger models, which doesn't apply here.

### Decision: `MAX_TOKENS` stays at `4096`, unchanged

**Choice**: Leave the constant as-is.
**Alternatives considered**: Lower it now that thinking-token headroom is no longer needed.
**Rationale**: No functional or cost impact — billing is by tokens actually generated, not the
cap, and the ~250-token prompt-enforced output ceiling already bounds real spend. Lowering it is
pure documentation tidiness with no behavior change; out of scope per proposal.md.

### Decision: Model ID string `claude-haiku-4-5` (no date suffix) — flagged for `sdd-apply` cross-check

**Choice**: Use the literal `claude-haiku-4-5`.
**Rationale**: This is the exact string from the orchestrator-supplied `claude-api` skill's live
model table; no other in-repo source has a comparable dated Haiku ID to cross-check against
(exploration.md's repo-wide grep confirmed `claude-opus-5` is the only live model-ID string in the
codebase). **`sdd-apply` MUST verify this string against the live Anthropic API/SDK types before
committing** — a wrong string fails gracefully via the existing 502 `UPSTREAM_ERROR` path
(`anthropicErrorResponse`, model-agnostic), but should not ship unverified.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/narrative/client.ts` | Modify | `MODEL` constant, drop `output_config`/`thinking`, rewrite doc comments |
| `tests/narrative/client.test.ts` | Modify | Rewrite call-shape assertion (lines ~110-128) + its description string |
| `openspec/specs/decision-narrative/spec.md` | Modify (delta, owned by `sdd-spec`) | ADDED `[MANUAL-VERIFICATION-ONLY]` scenario — already drafted in `openspec/changes/narrative-model-haiku/spec.md` |

No new files, no deletions, no other module touches `src/narrative/` (confirmed by exploration.md).

## Interfaces / Contracts

### `src/narrative/client.ts` — exact replacement content

```ts
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
```

### `tests/narrative/client.test.ts` — exact replacement for the call-shape test (lines ~110-128)

```ts
describe('streamNarrative — call shape', () => {
  it('calls messages.stream with claude-haiku-4-5, no thinking, no output_config, the static system prompt, and the JSON-serialized facts', async () => {
    streamMock.mockReturnValue(fakeAnthropicStream([]));
    const { streamNarrative } = await import('@/src/narrative/client');
    const { NARRATIVE_SYSTEM_PROMPT, buildUserMessage } = await import('@/src/narrative/prompt');

    const generator = streamNarrative(FACTS);
    await generator.next();

    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(streamMock).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: NARRATIVE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(FACTS) }],
    });
  });
});
```

No other test in the file changes — construction-laziness (T-5) and text_delta/thinking_delta
forwarding tests are model-agnostic (confirmed by exploration.md).

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Call shape (model, max_tokens, absence of `thinking`/`output_config`, system prompt, message body) | Mocked `@anthropic-ai/sdk`, `toHaveBeenCalledWith` exact-object assertion (above) |
| Unit | Client construction laziness (T-5), text_delta forwarding, thinking_delta discard | Unchanged, existing tests, unaffected by the model swap |
| Integration | `app/api/decisions/[asset]/narrative` error taxonomy | Unaffected — `tests/api/narrative.test.ts` has zero model/thinking/output_config assertions (confirmed by exploration.md); relies on typed SDK exception classes only |
| Manual (gated) | Spanish narrative prose quality vs. Opus 5 baseline | **Cannot be automated** — no in-repo rubric judges prose quality. Gated by the `[MANUAL-VERIFICATION-ONLY]` scenario already added to `openspec/changes/narrative-model-haiku/spec.md` under `decision-narrative` (owned/worded by `sdd-spec`, not redefined here). `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS without the user's explicit confirmation of that scenario. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. This change is a same-file parameter/constant edit to an existing,
already-isolated call seam (T-5 in the archived design); no new boundary is introduced.

## Migration / Rollout

No migration required. Rollback (per proposal.md) is a plain revert of `client.ts` and its test to
the prior commit — no data migration, no API surface change, no other module imports
`src/narrative/`. `ANTHROPIC_API_KEY` must have access to `claude-haiku-4-5`; verify before apply
(proposal.md Dependencies).

## Open Questions

- [ ] `claude-haiku-4-5` is not cross-verifiable against any other in-repo source (only one live
      model-ID string existed pre-change). `sdd-apply` MUST double-check this string against the
      live Anthropic API/SDK type definitions before committing.
- [ ] Narrative quality vs. the Opus 5 baseline is unresolved until the `[MANUAL-VERIFICATION-ONLY]`
      scenario is confirmed by the user — blocks archive-as-PASS, does not block apply.
