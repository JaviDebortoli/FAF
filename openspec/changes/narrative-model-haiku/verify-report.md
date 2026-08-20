# Verification Report: narrative-model-haiku

**Mode**: Full artifacts (proposal + design + spec + tasks + apply-progress) -- independent re-verification, not trust of apply-progress.md's claims.

## Completeness Table

| Task | Status | Independently confirmed |
|------|--------|--------------------------|
| 1.1 Rewrite call-shape test | [x] | Yes -- read tests/narrative/client.test.ts lines 110-127 |
| 1.2 RED confirmation | [x] | Not re-run (would require reverting client.ts); trusted as procedural evidence, not a compliance gate |
| 2.1 Model swap + param removal | [x] | Yes -- read src/narrative/client.ts |
| 2.2 Doc comment rewrite | [x] | Yes -- no stale "adaptive thinking headroom"/effort-tuning language found |
| 2.3 GREEN confirmation | [x] | Yes -- re-ran, 5/5 passed |
| Phase 3 (spec delta ownership note) | N/A (no apply action) | Yes -- confirmed openspec/specs/decision-narrative/spec.md untouched |
| 4.1 tsc --noEmit | [x] | Yes -- re-ran, exit 0 |
| 4.2 client.test.ts full file green | [x] | Yes -- re-ran, 5/5 passed |
| 4.3 Full suite green, tests/api/narrative.test.ts unaffected | [x] | Yes -- re-ran, 37/37 files, 224/224 tests passed |
| 4.4 Model-ID cross-check | [x] | Yes -- opened node_modules/@anthropic-ai/sdk/src/resources/messages/messages.ts at the cited line, citation is accurate |
| 5.1 MANUAL-VERIFICATION-ONLY narrative quality | [ ] intentionally open | Cannot be verified by an agent -- requires the user's own live confirmation |

8/9 automatable tasks complete and independently confirmed correct. Task 5.1 correctly remains open per this repo's manual-verification-gate norm.

## Build/Test Evidence (independently re-run, not copied)

npx tsc --noEmit
Exit 0, zero output -- zero type errors.

npx vitest run tests/narrative/client.test.ts
Test Files  1 passed (1)
Tests  5 passed (5)

npx vitest run (full suite)
Test Files  37 passed (37)
Tests  224 passed (224)

Includes tests/api/narrative.test.ts (15 tests) passing, and tests/dashboard/crypto/page.test.ts (1 test) passing (unrelated prior change, confirmed pre-existing and irrelevant to this change's scope).

These raw counts were produced by this verify phase's own command runs, not copied from apply-progress.md or the orchestrator's earlier spot-check.

## Source Inspection -- src/narrative/client.ts

Read the full current file. Confirmed against design.md's exact specified replacement content:
- Line 13: const MODEL = 'claude-haiku-4-5'; -- matches exactly.
- The client.messages.stream({...}) call (lines 64-69) contains only model, max_tokens, system, messages -- no output_config key, no thinking key anywhere in the call or file.
- Doc comments (lines 5-60) were rewritten, not left stale: no remaining reference to "adaptive thinking headroom," the old effort: 'low' rationale, or the archived design's "non-trivial synthesis" justification. The streamNarrative doc comment explicitly documents the omission of output_config/thinking and cites this change's own design.md as superseding the archived dashboard-ux design.md's Opus-5+adaptive-thinking rationale -- matches design.md's exact provided text.

## Source Inspection -- tests/narrative/client.test.ts

Read the full current file. The streamNarrative -- call shape test (lines 110-127):
- Uses expect(streamMock).toHaveBeenCalledWith with a fully-specified object (model: claude-haiku-4-5, max_tokens: 4096, system: NARRATIVE_SYSTEM_PROMPT, messages array) -- not a partial/subset matcher (no expect.objectContaining). toHaveBeenCalledWith on a complete object asserts an exact deep-equality match of the call arguments; if client.ts still sent output_config or thinking keys, this assertion would fail because the actual call argument would have extra keys not present in the expected object. This genuinely pins the absence of those keys, not an accidental omission.
- The it description string was updated to reference claude-haiku-4-5, no thinking, no output_config -- matches design.md.
- Other tests in the file (construction laziness T-5, text_delta/thinking_delta forwarding) are unchanged and model-agnostic, as design.md predicted.

## tests/api/narrative.test.ts -- confirmed unaffected

Read the full file (397 lines). Scanned for model-shape assertions: none found. All assertions concern HTTP status codes, error code fields, cache/rate-limit behavior, and ctorMock/streamMock call counts -- no assertion inspects model, thinking, or output_config. This confirms design.md's claim that this file is unaffected by the internal call-shape change. Full-suite run above confirms all 15 tests in this file still pass.

## Spec Delta Cross-Check

openspec/specs/decision-narrative/spec.md (live spec) was read in full: it contains only the five original requirements (endpoint contract, Spanish output, disclaimer, graceful degradation, cost-mitigation caching). No MANUAL-VERIFICATION-ONLY scenario is present in the live spec. This is correct, expected behavior, not a gap: per this repo's established convention (confirmed also in n8n-cadence-6h tasks.md Phase 3), ADDED-requirement deltas merge into the live spec at sdd-archive time, not sdd-apply. The delta itself (openspec/changes/narrative-model-haiku/spec.md) correctly contains the drafted MANUAL-VERIFICATION-ONLY scenario, staged for the archive-time merge.

## Model-ID Citation Cross-Check

Independently opened node_modules/@anthropic-ai/sdk/src/resources/messages/messages.ts at the cited region. Lines 1259-1275 define the Model type union, including the literals claude-haiku-4-5 and claude-haiku-4-5-20251001. Line 1269 is exactly 'claude-haiku-4-5' and line 1270 is 'claude-haiku-4-5-20251001'. apply-progress.md's citation (messages.ts:1269) is accurate -- the literal claude-haiku-4-5 is a genuine, valid model-ID string in the installed SDK's own type union. This confirms task 4.4's claim as a real second source beyond the orchestrator-supplied skill cache. As apply-progress.md itself notes, this is a type-definition-level check only -- live ANTHROPIC_API_KEY access to claude-haiku-4-5 was not verified by either apply or this verify phase (no live API call was made).

## claude-opus-5 Residual Reference Sweep

Repo-wide grep for claude-opus-5 (excluding node_modules/) found matches only in:
- openspec/changes/narrative-model-haiku/ (apply-progress, design, spec, proposal, exploration .md files) -- this change's own docs, narratively referencing the prior model as part of describing the swap. Expected and correct.
- openspec/changes/archive/2026-08-17-dashboard-ux/ (verify-report, state.yaml, proposal, design .md files) -- the archived change that originally introduced Opus 5 for this feature. This is an audit-trail artifact; design.md explicitly states it "must not be modified," and it was correctly left untouched.

A separate grep of src/ for the model literals found exactly one match: src/narrative/client.ts line 13 (claude-haiku-4-5). No other file in src/ references any Claude model literal -- there is no other feature in this repo currently calling the Anthropic API, so there is no unrelated legitimate claude-opus-5 usage elsewhere in live code, and no missed spot.

## Spec Compliance Matrix (decision-narrative delta)

| Requirement/Scenario | Status |
|---|---|
| Narrative quality manual verification (Haiku 4.5 swap) -- MANUAL-VERIFICATION-ONLY scenario | BLOCKED -- cannot be marked PASS/compliant by an automated verify phase. Per this repo's established manual-verification-gate norm (n8n-cadence-6h precedent), this scenario requires the user's own live confirmation of Spanish narrative quality against the Opus 5 baseline. Not an automation gap -- no in-repo rubric exists to judge prose quality, by design. |

No other spec requirement in decision-narrative was touched by this change (proposal.md: "No requirement pins model/thinking/effort, so no MODIFIED delta is needed for the swap") -- confirmed by reading the live spec, which is unchanged and all five of its requirements remain satisfied per the full-suite pass (224/224).

## Issues

CRITICAL: None.

WARNING: None.

SUGGESTION: None.

## Verdict

PASS WITH WARNINGS is not the correct framing here -- this is BLOCKED-ON-MANUAL-VERIFICATION, not a verify failure.

Everything automatable is independently confirmed correct:
- Source code matches design.md's exact specified content, verbatim.
- Test assertions genuinely pin the new call shape (exact-object match, not a loose match).
- tsc --noEmit clean (exit 0).
- Full test suite green: 37/37 files, 224/224 tests, independently re-run by this verify phase.
- tests/api/narrative.test.ts confirmed unaffected by reading its full content, not just its pass count.
- openspec/specs/decision-narrative/spec.md correctly left untouched (delta merges at archive time, per repo convention).
- Model-ID SDK-type citation independently confirmed accurate.
- No residual claude-opus-5 reference in live source; no unrelated legitimate usage found elsewhere in the repo to cause confusion.

This change cannot archive as full PASS yet. The single blocker is task 5.1, the MANUAL-VERIFICATION-ONLY narrative-quality scenario, which by explicit repo convention requires the user to generate a live Spanish narrative using claude-haiku-4-5 and confirm it reads acceptably versus the prior Opus 5 baseline. sdd-archive MUST NOT mark this change PASS until that confirmation is given.
