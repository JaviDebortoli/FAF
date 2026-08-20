# Tasks: Swap Tier 2 Narrative Model from Claude Opus 5 to Haiku 4.5

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~40-60 (1 model-swap + doc-comment rewrite in `client.ts`, 1 test-assertion rewrite) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Swap `src/narrative/client.ts` call shape to Haiku 4.5 + rewrite the pinned call-shape test | PR 1 | `npx vitest run tests/narrative/client.test.ts` | N/A — no live-LLM harness exists in this repo (design.md Testing Strategy); manual narrative-quality confirmation is the separate gated task 4.4 | `git checkout -- src/narrative/client.ts tests/narrative/client.test.ts` reverts both files; `openspec/specs/decision-narrative/spec.md` delta merge (owned by sdd-archive) is a separate, independently revertible step |

## Phase 1: RED — Pin the New Call Shape

- [x] 1.1 `tests/narrative/client.test.ts` (~lines 110-128) — rewrite the `streamNarrative — call shape` test to assert `streamMock` was called with `{ model: 'claude-haiku-4-5', max_tokens: 4096, system: NARRATIVE_SYSTEM_PROMPT, messages: [{ role: 'user', content: buildUserMessage(FACTS) }] }` (no `thinking`, no `output_config`), per design.md's exact provided assertion; update the `it(...)` description string to match.
- [x] 1.2 Run `npx vitest run tests/narrative/client.test.ts` and confirm this test now FAILS against the current (Opus 5) `client.ts` — this is the required RED confirmation before touching production code.

## Phase 2: GREEN — Implement the Model Swap

- [x] 2.1 `src/narrative/client.ts` — change `MODEL` to `'claude-haiku-4-5'`, remove `output_config: { effort: 'low' }`, remove `thinking: { type: 'adaptive' }` entirely (no replacement) from the `client.messages.stream({...})` call.
- [x] 2.2 `src/narrative/client.ts` — rewrite the `MODEL`, `MAX_TOKENS`, and `streamNarrative` doc comments to design.md's exact provided text (Haiku-4.5 rationale, no-`thinking` rationale, supersedes-archived-design note).
- [x] 2.3 Run `npx vitest run tests/narrative/client.test.ts` and confirm the rewritten test from 1.1 now PASSES (GREEN).

## Phase 3: Spec Delta (ownership note)

- Note: `openspec/specs/decision-narrative/spec.md`'s ADDED `[MANUAL-VERIFICATION-ONLY]` narrative-quality requirement merges from `openspec/changes/narrative-model-haiku/spec.md` **during `sdd-archive`, not `sdd-apply`** — per this repo's established convention (`n8n-cadence-6h` tasks.md Phase 3). No apply-phase action here; do not hand-merge the live spec early.

## Phase 4: Verification

- [x] 4.1 Run `npx tsc --noEmit` — confirm zero type errors from the `client.ts` param removal and doc-comment rewrite.
- [x] 4.2 Run `npx vitest run tests/narrative/client.test.ts` — confirm the full file (not just the rewritten test) is green, no other test in this file broke.
- [x] 4.3 Run the full `npx vitest run` suite — confirm zero regressions repo-wide; explicitly check `tests/api/narrative.test.ts` stays green unmodified (it mocks `streamNarrative`/the Anthropic client with no model/thinking/output_config assertions, per design.md).
- [x] 4.4 Before commit, double-check the literal model-ID string `claude-haiku-4-5` (no date suffix) against the live Anthropic API/SDK type definitions — design.md flagged this string could not be cross-verified against any other in-repo source, only against the orchestrator-supplied `claude-api` skill cache. Cross-checked against the installed `@anthropic-ai/sdk@0.117.1` bundled type union (`node_modules/@anthropic-ai/sdk/src/resources/messages/messages.ts:1269`), which lists `claude-haiku-4-5` as a valid literal model string alongside its dated pin `claude-haiku-4-5-20251001`. This is a genuine second source beyond the orchestrator skill cache. Live-key access to the model (proposal.md Dependencies) is NOT verified here — no live API call was made.

## Phase 5: Manual Verification Handoff (do NOT check off during sdd-apply)

- [x] 5.1 **[MANUAL-VERIFICATION-ONLY]** Spanish narrative quality confirmed against the Opus 5 baseline: generate a live narrative for a real asset decision using `claude-haiku-4-5` and manually read it to confirm it reads acceptably relative to the prior Opus 5 output. Not automatable — no in-repo rubric judges Spanish prose quality. Per this project's manual-verification-gate norm (established in `n8n-cadence-6h` task 5.1), this item MUST stay unchecked and open until the user explicitly confirms; `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS without that confirmation.
  **CONFIRMED by user, 2026-08-20** (verbatim, Spanish): "Acabo de probarlo en produccion y funciona correctamente." (= "I just tested it in production and it works correctly.") Given live, in production, after the Haiku 4.5 swap was deployed. This satisfies the scenario's GIVEN/WHEN/THEN and closes the sole remaining archive gate, per the same manual-verification-gate norm and process precedent established in `n8n-fetch-klines-item-fix` (Engram id 1544).
