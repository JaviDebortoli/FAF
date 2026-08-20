# Apply Progress: Swap Tier 2 Narrative Model from Claude Opus 5 to Haiku 4.5

**Mode**: Strict TDD (RED → GREEN, followed exactly per tasks.md Phase 1/2 ordering)

## Completed Tasks

- [x] 1.1 Rewrote `streamNarrative — call shape` test in `tests/narrative/client.test.ts` (~lines 110-129) to expect `{ model: 'claude-haiku-4-5', max_tokens: 4096, system: NARRATIVE_SYSTEM_PROMPT, messages: [...] }` with NO `thinking` key and NO `output_config` key; updated the `it(...)` description string.
- [x] 1.2 Ran `npx vitest run tests/narrative/client.test.ts` against the still-Opus-5 `client.ts` — confirmed RED (1 failed, 4 passed). Diff showed expected `model: 'claude-haiku-4-5'` vs received `model: 'claude-opus-5'`, plus extra unexpected `output_config`/`thinking` keys.
- [x] 2.1 `src/narrative/client.ts` — `MODEL` changed to `'claude-haiku-4-5'`; `output_config: { effort: 'low' }` and `thinking: { type: 'adaptive' }` removed entirely from the `client.messages.stream({...})` call (no replacement).
- [x] 2.2 Rewrote the `MODEL`, `MAX_TOKENS`, and `streamNarrative` doc comments to design.md's exact provided replacement text — no remaining references to "adaptive thinking headroom" or the old effort-tuning rationale.
- [x] 2.3 Ran `npx vitest run tests/narrative/client.test.ts` — confirmed GREEN (5/5 passed).
- [x] 4.1 `npx tsc --noEmit` — zero type errors.
- [x] 4.2 `npx vitest run tests/narrative/client.test.ts` — 5/5 passed, no other test in the file broke.
- [x] 4.3 `npx vitest run` (full suite) — 37 files / 224 tests passed, zero regressions. `tests/api/narrative.test.ts` (15 tests) confirmed still green and unmodified — it mocks `streamNarrative` and has no model/thinking/output_config assertions, so it was unaffected by the internal call-shape change as design.md predicted; verified by actually running it, not assumed.
- [x] 4.4 Cross-checked the model-ID string `claude-haiku-4-5`. See "Model-ID Verification" below.

### Phase 3: Spec Delta — explicitly NOT touched

Per tasks.md Phase 3 note and this repo's established convention (`n8n-cadence-6h` precedent): `openspec/specs/decision-narrative/spec.md` was **not edited**. The ADDED `[MANUAL-VERIFICATION-ONLY]` requirement in `openspec/changes/narrative-model-haiku/spec.md` merges into the live spec at `sdd-archive` time, not `sdd-apply`.

### Phase 5: Manual Verification — explicitly LEFT OPEN

- [ ] 5.1 **[MANUAL-VERIFICATION-ONLY]** — Spanish narrative quality vs. the Opus 5 baseline. **This checkbox was deliberately left unchecked in `tasks.md`.** It requires the user to generate a live narrative for a real asset decision using `claude-haiku-4-5` and manually confirm prose quality is acceptable. Not automatable (no in-repo rubric judges Spanish prose). `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS without that explicit user confirmation.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `tests/narrative/client.test.ts` | Modified | Rewrote the call-shape assertion (lines ~110-128) and its `it(...)` description to pin the new Haiku 4.5 shape (no `thinking`, no `output_config`) |
| `src/narrative/client.ts` | Modified | `MODEL` → `'claude-haiku-4-5'`; removed `output_config` and `thinking` params; rewrote `MODEL`/`MAX_TOKENS`/`streamNarrative` doc comments per design.md |
| `openspec/changes/narrative-model-haiku/tasks.md` | Modified | Marked tasks 1.1, 1.2, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4 `[x]`; task 5.1 left `[ ]` intentionally |

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| Call-shape swap (client.ts + client.test.ts) | Rewrote test first (1.1); ran it against unmodified Opus-5 `client.ts`, confirmed 1 failed / 4 passed with exact expected-vs-received diff (`model: claude-opus-5` present, `output_config`/`thinking` extras present) | Edited `client.ts` (2.1); re-ran test, confirmed 5/5 passed | Doc comments rewritten (2.2) to design.md's exact text — no behavior change, comment-only refactor, verified still green after |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run tests/narrative/client.test.ts` → 5 passed (5) |
| Runtime harness command/scenario and exact result | N/A — no live-LLM harness exists in this repo (design.md Testing Strategy). Manual narrative-quality confirmation is the separate gated task 5.1, deliberately not run here. |
| Rollback boundary | `git checkout -- src/narrative/client.ts tests/narrative/client.test.ts` reverts both files atomically; the `openspec/specs/decision-narrative/spec.md` delta merge (owned by `sdd-archive`) is a separate, independently revertible step not touched by this apply batch |

## Verification Commands (actual output)

**`npx vitest run tests/narrative/client.test.ts`** (RED, before 2.1/2.2):
```
tests/narrative/client.test.ts (5 tests | 1 failed) 24ms
  streamNarrative — call shape > calls messages.stream with claude-haiku-4-5, ...
    expected "spy" to be called with arguments: [ { model: 'claude-haiku-4-5', ... } ]
    Received: { model: 'claude-opus-5', output_config: { effort: 'low' }, thinking: { type: 'adaptive' }, ... }
Test Files  1 failed (1)
     Tests  1 failed | 4 passed (5)
```

**`npx vitest run tests/narrative/client.test.ts`** (GREEN, after 2.1/2.2):
```
✓ tests/narrative/client.test.ts (5 tests) 23ms
Test Files  1 passed (1)
     Tests  5 passed (5)
```

**`npx tsc --noEmit`**: exit 0, no output (zero type errors).

**`npx vitest run`** (full suite):
```
Test Files  37 passed (37)
     Tests  224 passed (224)
```
Includes `tests/api/narrative.test.ts (15 tests)` — confirmed passing unmodified, as design.md predicted (it mocks `streamNarrative`, no model/thinking/output_config assertions).

## Model-ID Verification (task 4.4 / design.md Open Question)

design.md flagged `claude-haiku-4-5` as unverifiable against any other in-repo source, only against the orchestrator-supplied `claude-api` skill cache (dated 2026-06-24).

During apply, a **second, independent source** was found and cross-checked: the installed `@anthropic-ai/sdk@0.117.1` package's own bundled TypeScript type definitions
(`node_modules/@anthropic-ai/sdk/src/resources/messages/messages.ts:1269`) list `claude-haiku-4-5` as a valid literal model-ID string in the SDK's model union type, alongside its dated pin `claude-haiku-4-5-20251001`. This corroborates the string independently of the skill cache.

**What remains unverified**: this is a type-definition-level check (the string is a recognized, well-formed model ID per the SDK's own shipped types), not a live API call. `ANTHROPIC_API_KEY` access to `claude-haiku-4-5` specifically (proposal.md Dependencies) was NOT verified — no live Anthropic API call was made during apply. This should be verified before merge/deploy, consistent with proposal.md's Risks table ("Wrong/invalid model-ID string ... verify against live API before merge").

## Deviations from Design

None — implementation matches design.md's exact provided replacement content for both `client.ts` and the test assertion, verbatim.

## Issues Found

None.

## Remaining Tasks

- [ ] 5.1 **[MANUAL-VERIFICATION-ONLY]** — user must generate a live narrative and confirm Spanish prose quality vs. the Opus 5 baseline before this change can archive as PASS. Explicitly NOT completed by this apply batch; do not mark it `[x]` in a future batch either — only the user can confirm it.

## Workload / PR Boundary

- Mode: single PR (workload forecast: Low risk, no chaining needed)
- Current work unit: Unit 1 — "Swap `src/narrative/client.ts` call shape to Haiku 4.5 + rewrite the pinned call-shape test"
- Boundary: starts from RED test rewrite, ends at full-suite GREEN verification (Phase 4 complete); spec delta merge and manual verification are explicitly out of this batch's boundary
- Estimated review budget impact: ~50 changed lines (model swap + doc comments + one test assertion), well under the 400-line budget; matches tasks.md's ~40-60 line estimate

## Status

8/9 automatable tasks complete (1.1, 1.2, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4). Phase 3 required no action (ownership note only). Task 5.1 (manual-verification gate) intentionally remains open — blocks `sdd-archive` PASS, does not block `sdd-verify`. Ready for `sdd-verify`.
