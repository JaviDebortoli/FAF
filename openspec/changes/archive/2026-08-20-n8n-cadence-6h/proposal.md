# Proposal: Sync spec/docs/node-metadata to the manually-applied 6h n8n cadence

## Intent

The user manually changed the `Schedule Trigger` node in n8n Cloud from a 2-minute interval to a 6-hour
interval (`active: false → true`) to cut execution volume and reduce budget spend — decision already made
and live in production; this change is not about re-deciding cadence, only about bringing the repo's spec,
docs, and node metadata into sync with it. Currently `openspec/specs/semantic-ingestion/spec.md:25` pins
n8n to "1-5 min", directly contradicted by the live 6h config, and four other docs/comments still describe
the old cadence with reasoning that is now backwards (2min-finer-than-1h-candle vs. 6h-coarser-than-candle).

**PRD deviation flag** (per `openspec/config.yaml` `rules.proposal`): `docs/PRD.md:57` states "cada 1-5
minutos" — this change deviates from that. **Sign-off already given** via the user's verbatim decision
statement (cost-reduction rationale).

## Scope

### In Scope
- `n8n/faf-workflow.json`: rename `Schedule Trigger (1hr)` → `Schedule Trigger (6h)`; rewrite `notes` to
  state the 6h cadence, budget rationale, and the limit=50-covers-the-gap safety argument (primary), with
  idempotency as a secondary backstop. (Interval/`active` fields are already changed by the user's manual edit.)
- `openspec/specs/semantic-ingestion/spec.md:25`: MODIFY the "n8n scheduler-only role (D2)" requirement to
  pin the exact configured value (`6h`), not a vague range.
- `docs/PRD.md:57`, `docs/architecture-notes.md` ("Cron cadence vs. candle-close" section),
  `n8n/POST_IMPORT_STEPS.md:14`: correct cadence value + reframe safety rationale to coarser-than-candle.
- `tests/cycle/idempotency.test.ts:6`: fix stale comment (not an assertion).

### Out of Scope
- n8n Cloud's own re-export artifacts in the same JSON diff (URL, credential ID, node positions,
  `batching.batch`, `availableInMCP`, regenerated IDs) — untouched, unrelated to cadence.
- Re-deciding the cadence value itself — already decided and live.
- Any code/test-assertion changes beyond the one stale comment — no test asserts a cadence value today.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `semantic-ingestion`: "n8n scheduler-only role (D2)" requirement's pinned cadence changes from "1-5 min"
  to "6h"; safety rationale reframes from finer-than-candle to `limit=50`-covers-the-gap (~44-candle margin).

## Approach

Mechanical consistency sync following an already-applied config change: update the one binding spec
requirement, four doc/comment locations, and the drifted node `name`/`notes` fields, replacing the
now-inverted "cadence finer than candle" framing with the verified "50-candle fetch window absorbs ~6
new candles per 6h cycle" argument as primary, idempotency as secondary backstop.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `n8n/faf-workflow.json` | Modified | Node `name`/`notes` corrected to match already-changed interval |
| `openspec/specs/semantic-ingestion/spec.md` | Modified | D2 requirement cadence pinned to 6h |
| `docs/PRD.md` | Modified | Cadence line corrected |
| `docs/architecture-notes.md` | Modified | Cadence rationale reframed |
| `n8n/POST_IMPORT_STEPS.md` | Modified | Diagram label corrected |
| `tests/cycle/idempotency.test.ts` | Modified | Stale comment corrected |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PRD deviation (cadence) | N/A — already signed off | Verbatim user decision recorded above |
| `name`/`notes` drift recurring (already happened once before) | Med | Flag as recurring pattern for design; no automated n8n-JSON content check proposed (disproportionate for scope) |
| **[MANUAL-VERIFICATION-ONLY]**: no automated test covers n8n cadence in production | High (standing) | The 6h schedule actually firing correctly in production is unverifiable by CI; per this repo's manual-verification-gate norm, `sdd-verify`/`sdd-archive` MUST NOT mark this PASS without the user confirming a live 6h-interval run in production |

## Rollback Plan

Revert the doc/spec/comment edits via `git revert`; re-import `n8n/faf-workflow.json` with the interval
reverted to 2min and `active: false` if the cadence decision itself is reversed (out of scope here, but
mechanically trivial).

## Dependencies

- None — the n8n config change is already live; this change only syncs the repo record to it.

## Success Criteria

- [ ] `semantic-ingestion` spec, PRD, architecture-notes, POST_IMPORT_STEPS, and the idempotency test
      comment all state 6h consistently.
- [ ] `Schedule Trigger` node `name`/`notes` accurately describe the 6h cadence and safety rationale.
- [ ] `[MANUAL-VERIFICATION-ONLY]`: user confirms the 6h schedule fires correctly in production before archive.

## Proposal question round

Scope and decision are already confirmed (see exploration + binding user decision), so this is advisory,
not blocking:

1. Should the spec pin an exact `6h` value (recommended, avoids re-drift) or a tolerance range in case n8n
   Cloud Starter's scheduler has jitter?
2. If a scheduled run is missed (n8n downtime, plan limits) and the gap exceeds ~44h, `limit=50` no longer
   covers it — is silent data loss beyond that window acceptable for now, or should a future change add
   gap detection?
3. Is there a way to confirm the cost-reduction goal was actually achieved (e.g., check n8n Cloud execution
   count/billing after a week), or is "6h cadence live" sufficient success on its own?

**Assumption if unanswered**: pin exact `6h`, treat >44h gaps as out of scope/future work, and treat the
change as successful once cadence + docs are consistent and one live cycle is confirmed.
