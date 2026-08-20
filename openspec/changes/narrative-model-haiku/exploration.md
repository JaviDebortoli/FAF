# Exploration: narrative-model-haiku — swap Tier 2 narrative model from Claude Opus 5 to Haiku 4.5

## Current State

`src/narrative/client.ts` exports `streamNarrative`, an async generator constructing `new Anthropic()` lazily inside the generator body (design.md threat T-5), calling `client.messages.stream({ model: 'claude-opus-5', max_tokens: 4096, thinking: { type: 'adaptive' }, output_config: { effort: 'low' }, system: NARRATIVE_SYSTEM_PROMPT, messages: [...] })`. Only `text_delta` chunks are yielded. `NARRATIVE_SYSTEM_PROMPT` (`src/narrative/prompt.ts`) explicitly frames the task as bounded restatement: "No calculas ni decides nada: tu única tarea es traducir a lenguaje natural los datos que se te entregan," whitelist-projected via `buildNarrativeFacts` (`src/narrative/facts.ts`).

`app/api/decisions/[asset]/narrative/route.ts`'s `GET` drives the generator with a 45s deadline, caching only clean completions per `(asset, t)`. Error classification (`anthropicErrorResponse`) uses typed SDK exceptions only — `Anthropic.RateLimitError`/`APIConnectionError` → 503, `Anthropic.APIError` → 502, else → 500 — entirely provider-level, not model-specific.

Original design rationale (`openspec/changes/archive/2026-08-17-dashboard-ux/design.md`, "Claude call shape") chose `claude-opus-5` + adaptive thinking with the stated reason "non-trivial synthesis over the label algebra" — in tension with the prompt's own "you don't calculate or decide anything" framing. This tension pre-dates this change; the cost goal is a legitimate trigger to revisit it.

## Affected Areas

- `src/narrative/client.ts` — `MODEL` constant, `output_config`, `thinking` param, and rationale comments (lines 10, 47-53, 61-62) need rewriting.
- `tests/narrative/client.test.ts` (lines 110-128) — the ONLY test asserting call-shape (`toHaveBeenCalledWith({ model: 'claude-opus-5', thinking: { type: 'adaptive' }, output_config: { effort: 'low' }, ... })`) plus its description string. All other tests in the file (construction laziness, text_delta forwarding, thinking_delta discard) are model-agnostic, unaffected.
- `tests/api/narrative.test.ts` — CONFIRMED (full read): zero `model`/`thinking`/`output_config` assertions anywhere; error-table tests exercise SDK exception classes directly. No changes needed.
- `openspec/specs/decision-narrative/spec.md` — CONFIRMED (full read): none of its 5 requirements pin model name, `thinking`, or `effort`. No MODIFIED delta needed for the swap itself.
- `docs/PRD.md` — CONFIRMED via grep: D7 discusses the narrative feature generically, no model pinning.
- `docs/architecture-notes.md` — CONFIRMED via grep: zero Claude/Opus/narrative-model references.
- `.env.example` — only `ANTHROPIC_API_KEY=`, no model-name env var to touch.
- Archived docs (`openspec/changes/archive/2026-08-17-dashboard-ux/{design.md,proposal.md,state.yaml}`) still say `claude-opus-5` — audit trail, must NOT be edited; the new design.md should reference/supersede them instead.

## Design Question: should the Haiku 4.5 call include `thinking`?

**Recommendation: omit `thinking` entirely.**

1. The task is bounded restatement by the prompt's own design — no synthesis step classic thinking would meaningfully improve, unlike the already-tension-flagged "non-trivial synthesis" reasoning that justified adaptive thinking under Opus 5.
2. Anthropic's own guidance frames thinking for this model tier as "only if explicitly requested" — omission is the documented default, not a corner case.
3. Classic thinking requires `budget_tokens ≥ 1024` and strictly `< max_tokens` — workable, but added sizing complexity this bounded task doesn't need.
4. Thinking tokens bill as output tokens at Haiku's $5/1M rate — omitting is strictly additive to the cost-reduction goal.
5. Reversible: if quality regresses (per the manual-verification gate below), classic `{ type: 'enabled', budget_tokens: N }` can be added in a follow-up once there's concrete evidence, cheaper than carrying unused complexity now.

This is `sdd-design`'s decision to finalize; this exploration's recommendation is omission.

## MAX_TOKENS = 4096 — still appropriate?

Yes, unaffected. Context window: Haiku 4.5's 200K vs Opus/Sonnet's 1M is irrelevant — input is a small whitelisted JSON facts payload, far below 200K. Output cap: 4096 was sized to cover "thinking headroom" above the ~250-token prompt-enforced output ceiling; without `thinking` it's simply more generous than needed but causes no cost/correctness issue (billing is by tokens actually generated, not the cap). No functional change required; `sdd-design` MAY lower it for documentation clarity, optional not required.

## Model ID discrepancy check

Repo-wide grep for `claude-haiku|claude-opus|claude-sonnet|-4-5-|-20251` found exactly one live model-ID string (`claude-opus-5`, in `src/narrative/client.ts` and its test mirror) — no other cached/dated Haiku ID exists anywhere in-repo to cross-check against. The exact string `claude-haiku-4-5` (no date suffix) comes from the orchestrator-supplied `claude-api` skill's live-cached model table (2026-06-24), which explicitly warns against appending date suffixes. `sdd-apply` should use `claude-haiku-4-5` as the constant.

## Spec-conflict check

No MODIFIED delta needed for the model swap itself (confirmed above — none of `decision-narrative/spec.md`'s 5 requirements pin the model name or thinking/effort params). One **ADDED** consideration: this repo has an established `[MANUAL-VERIFICATION-ONLY]` scenario norm (`openspec/specs/semantic-ingestion/spec.md`, `openspec/changes/n8n-cadence-6h/spec.md`). Automated tests can verify the Haiku 4.5 call succeeds and forwards `text_delta` text — not that the Spanish narrative reads as well as the Opus 5 baseline. Recommend `sdd-spec` add one `[MANUAL-VERIFICATION-ONLY]` scenario to `decision-narrative/spec.md` gating this change from archiving PASS until the user manually confirms narrative quality — same pattern/wording as `n8n-cadence-6h`'s live-schedule gate.

## Test-impact catalog

| File | Assertion | Action |
|---|---|---|
| `tests/narrative/client.test.ts:110-128` | `toHaveBeenCalledWith({ model: 'claude-opus-5', max_tokens: 4096, thinking: {type:'adaptive'}, output_config: {effort:'low'}, ... })` + description string | MUST rewrite |
| `tests/narrative/client.test.ts` (other tests) | Construction laziness, text_delta forwarding, thinking_delta discard | No change |
| `tests/api/narrative.test.ts` (all) | No model/thinking/output_config refs; SDK exception classes only | No change |
| `tests/narrative/prompt.test.ts` | Golden-string + no-interpolation on prompt | Unaffected |
| `tests/narrative/facts.test.ts` | Whitelist projection | Unaffected |

## Risks

- Wrong model-ID string fails gracefully (caught by existing 502 `UPSTREAM_ERROR` handling) but must still be verified against the live API before apply.
- Output-quality regression is the primary risk of this change — mitigated by the recommended manual-verification gate, not automated-test coverage alone.
- `client.ts`'s doc comments justify current params in terms of adaptive-thinking headroom; these will go stale and must be rewritten, not just the code (repo style rule requires accurate non-obvious rationale comments).
- Archived design.md still documents `claude-opus-5` — correct to leave unedited, but new design.md must explicitly supersede it.

## Ready for Proposal

Yes. Small, well-scoped change: 1 code file + 1 test file + optionally 1 spec delta (ADDED manual-verification scenario) + 1 new design.md documenting the thinking-param decision and superseding the archived rationale.
