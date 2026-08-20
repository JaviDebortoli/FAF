# Exploration: n8n-cadence-6h

## Current State

The user manually edited `n8n/faf-workflow.json` directly in n8n Cloud (exported into the repo, currently uncommitted) to reduce execution frequency and cost:

- `Schedule Trigger` node's `rule.interval` changed from `{field: "minutes", minutesInterval: 2}` to `{field: "hours", hoursInterval: 6}`.
- `active` flag changed from `false` to `true` (workflow is now live in production).
- The node's `name` field is still `"Schedule Trigger (1hr)"` — stale (it was already wrong before this edit, since the interval was actually 2 minutes, not 1 hour).
- The node's `notes` field is unchanged and still describes 2-minute cadence reasoning ("intentionally finer than the 1h candle... most ticks land on an in-progress candle") — this framing is now backwards: 6h is coarser than the 1h candle, not finer.

Other incidental diffs in the same file (n8n Cloud's own re-export artifacts, out of scope, not to be touched): real deployed URL now filled in, credential ID updated, node positions rearranged, `batching.batch` simplified, `availableInMCP` removed, `versionId`/`meta.instanceId`/workflow `id` regenerated.

## Affected Areas

- `n8n/faf-workflow.json` — `Schedule Trigger` node's `name` and `notes` fields need a mechanical rewrite to accurately describe the 6h cadence, the budget rationale, and the real safety argument (see below).
- `openspec/specs/semantic-ingestion/spec.md:25` — live, binding requirement: "n8n MUST act only as a Schedule Trigger (1-5 min)..." — directly violated by 6h. This is the ONLY cadence-tied requirement/scenario in that spec (confirmed by full-file check). Needs a `MODIFIED Requirements` delta pinning the new cadence.
- `docs/PRD.md:57` — "Automatización: n8n con Schedule Trigger cada 1-5 minutos." — stale.
- `docs/architecture-notes.md` (section "Cron cadence vs. candle-close: why recompute idempotency, not cadence alignment") — built entirely around cadence being finer than the 1h candle; needs rewording since the practical concern flips at 6h cadence.
- `n8n/POST_IMPORT_STEPS.md:14` — ASCII pipeline diagram label "Schedule Trigger (1-5min)" — stale.
- `tests/cycle/idempotency.test.ts:6` — a stale code *comment* referencing old cadence (not an assertion; no test in the repo asserts any cadence value).
- No repo-root `README.md` exists; nothing else live (outside `openspec/changes/archive/**`, correctly untouched) references the old cadence.

## Safety arithmetic (verified, not assumed)

`Fetch Klines` node is confirmed configured with `interval: "1h"`, `limit: "50"`. At 6h between runs, ~6 new 1h candles land per cycle — well within the 50-candle fetch window (~44-candle safety margin). This is the primary reason 6h cadence is safe, and should lead the rationale in the node's notes and in `architecture-notes.md`, with idempotency (`runCycle` being a pure function, repeated calls are no-ops) kept as a secondary/backstop point rather than the primary argument as it is worded today.

## Recommended fixes

1. **Spec**: `openspec/specs/semantic-ingestion/spec.md` — MODIFY the "n8n scheduler-only role (D2)" requirement to pin the new cadence (recommend stating the exact configured value, `6h`, rather than reintroducing a vague range like the old "1-5 min" — avoids the same drift recurring).
2. **n8n node**: rename `"Schedule Trigger (1hr)"` → `"Schedule Trigger (6h)"`; rewrite `notes` to state the 6h cadence, the budget-reduction rationale (user's explicit reason), and the limit=50-covers-the-gap safety argument, with idempotency as a secondary backstop.
3. **Docs**: update `docs/PRD.md:57`, `docs/architecture-notes.md`'s cadence section, and `n8n/POST_IMPORT_STEPS.md:14` to say 6h instead of 1-5min, with `architecture-notes.md`'s rationale reworded to match the new coarser-than-candle framing.
4. **Comment**: correct the stale comment in `tests/cycle/idempotency.test.ts:6`.

## Risks

- The node's `name`/`notes` drift is a repeat pattern (it was already stale before this edit — said "1hr" while actually 2min). Worth the eventual delta spec/design flagging this as a recurring drift risk, though a fully automated spec-check for n8n JSON content is likely disproportionate for this project's scope.
- No automated test/CI covers n8n cadence at all — verification will rely on manual/spec-level review, consistent with this repo's existing n8n manual-verification-gate convention (changes with `[MANUAL-VERIFICATION-ONLY]` scenarios require live user confirmation before archiving as PASS).

## Ready for Proposal

Yes. Small, well-scoped consistency/spec-sync change: 1 JSON node's name/notes + 4 doc/spec locations, all identified with exact line numbers.
