# Proposal: Swap Tier 2 Narrative Model from Claude Opus 5 to Haiku 4.5

## Intent

The Tier 2 narrative feature (`src/narrative/client.ts`) calls Claude Opus 5
($5/$25 per 1M input/output tokens) to restate already-computed decision facts
in Spanish prose. The task is bounded restatement, not synthesis (see D7:
"el modelo solo puede restatear hechos ya calculados"), so Opus-tier pricing
is disproportionate to the work being done. Claude Haiku 4.5 ($1/$5 per 1M,
~5x cheaper) is the right tier for this workload. This is a cost/token-spend
reduction, decided explicitly by the user after a cost/tradeoff discussion in
this session, accepting that it requires reworking the call shape (not a
drop-in model-string swap) and needs empirical quality validation before
archive.

## Proposal question round

Already resolved inline in this session's conversation, not deferred:
- Business problem: Opus 5 pricing on a restatement-only task. Confirmed by user.
- Product outcome: same narrative UX, ~5x lower per-call cost. Confirmed.
- Business risk accepted: possible narrative quality regression, mitigated by
  a standing manual-verification gate before archive (see Risks). Confirmed.
No further question round requested; proceeding to spec/design.

## Scope

### In Scope
- `src/narrative/client.ts`: `MODEL` constant → `claude-haiku-4-5`; remove
  `output_config: { effort: 'low' }` and `thinking: { type: 'adaptive' }`
  (both unsupported/error on Haiku 4.5); omit `thinking` entirely (bounded
  restatement task, no synthesis step it would improve); rewrite stale doc
  comments justifying the old params.
- `tests/narrative/client.test.ts`: rewrite the one call-shape assertion
  (~lines 110-128) pinning `model`/`thinking`/`output_config`.
- `openspec/specs/decision-narrative/spec.md`: one ADDED
  `[MANUAL-VERIFICATION-ONLY]` scenario gating narrative-quality confirmation
  before archive (same pattern as `n8n-cadence-6h`'s live-schedule gate).
- New `design.md` documenting the thinking-param decision and explicitly
  superseding the archived Opus-5+adaptive-thinking rationale.

### Out of Scope
- `tests/api/narrative.test.ts` — no model-specific assertions, unaffected.
- `MAX_TOKENS = 4096` — unchanged; no functional need to lower it.
- Editing archived `openspec/changes/archive/2026-08-17-dashboard-ux/design.md`
  — audit trail, must not be modified.
- Any change to `src/{rdf,stream,laf,decision,cycle}` (L1-L4 pipeline) — this
  is presentation-layer only, per D7 clause 6.
- Classic `thinking` with explicit `budget_tokens` — deferred; only added
  later if the manual-verification gate finds a quality regression.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `decision-narrative`: ADDED one `[MANUAL-VERIFICATION-ONLY]` scenario
  gating archive on manual narrative-quality confirmation. No requirement
  pins model/thinking/effort, so no MODIFIED delta is needed for the swap.

## Approach

Change the Anthropic SDK call shape in `client.ts` (model ID + drop two
Opus-specific params), update the one test asserting that shape, and add a
manual-verification gate to the spec so this change cannot archive as PASS
without a human confirming the Haiku 4.5 narrative still reads acceptably in
Spanish. `sdd-design` finalizes the `thinking` decision (recommendation:
omit) and documents why the archived design.md's "non-trivial synthesis"
rationale no longer applies.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `src/narrative/client.ts` | Modified | Model ID, dropped params, doc comments |
| `tests/narrative/client.test.ts` | Modified | Call-shape assertion rewrite |
| `openspec/specs/decision-narrative/spec.md` | Modified (delta) | ADDED manual-verification scenario |
| `openspec/changes/narrative-model-haiku/design.md` | New | Supersedes archived Opus-5 rationale |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Narrative quality regression vs. Opus 5 baseline | Medium | `[MANUAL-VERIFICATION-ONLY]` scenario blocks archive-as-PASS until a human confirms Spanish narrative quality |
| Wrong/invalid model-ID string | Low | Caught by existing 502 `UPSTREAM_ERROR` path; verify against live API before merge |
| Omitting `thinking` under-serves the task | Low | Reversible — classic `thinking` with `budget_tokens` can be added in a follow-up if the gate finds regressions |

## Rollback Plan

Revert `src/narrative/client.ts` and its test to the prior commit (`MODEL =
'claude-opus-5'`, restore `output_config`/`thinking`). No data migration, no
API surface change, no other module imports `src/narrative/`.

## Dependencies

- `ANTHROPIC_API_KEY` must have access to `claude-haiku-4-5`; verify before apply.

## Success Criteria

- [ ] `client.ts` calls Haiku 4.5 with no `output_config`/`thinking` params
- [ ] `tests/narrative/client.test.ts` passes with updated call-shape assertion
- [ ] `npx vitest run` and `npx tsc --noEmit` pass repo-wide
- [ ] Manual verification confirms narrative quality is acceptable before archive
