# Proposal: Raise the presentation-cache TTL to match the 6h n8n cadence

## Intent

Production dashboard intermittently shows "Servicio momentáneamente no disponible" and only recovers when
n8n is manually re-triggered. Root cause confirmed via exploration: `BETA_MS` (`src/cycle/constants.ts:7`,
the `src/cycle/latest.ts` presentation-cache TTL) is still `1h`, left over from before `n8n-cadence-6h`
moved n8n's polling interval to `6h`. The cache now expires 1h after every push, leaving a ~5h dead window
every cycle where `GET /api/decisions` returns 503 and the narrative route returns 404 — no stale data
exists to fall back on, client or server, which is why manual re-trigger was the only recovery.

## Scope

### In Scope
- `src/cycle/constants.ts:7`: raise `BETA_MS` from `60 * 60 * 1000` (1h) to `8 * 60 * 60 * 1000` (8h) —
  6h cadence + ~33% safety margin, within the user's authorized "~7-8h" range.
- `src/cycle/constants.ts`: fix the `BETA_MS` doc-comment, which misleadingly references the unrelated
  Cuadro 1 β (dimensionless candle-count in `stream-windowing`, not this millisecond TTL).
- ADD one `[MANUAL-VERIFICATION-ONLY]` scenario gating archive: user confirms live in production that
  "Servicio momentáneamente no disponible" no longer appears during a normal 6h inter-run window.

### Out of Scope
- Removing TTL/expiry entirely and always showing last-known data — user explicitly chose the bounded-TTL
  fix instead.
- The Vercel serverless multi-instance cache-sharing risk (secondary/probabilistic contributor noted in
  diagnosis) — bigger architectural change, not requested.
- Any change to `src/narrative/cache.ts` — its default TTL parameter (`= BETA_MS`) stays coupled and
  inherits the new value automatically; no code edit needed there.
- Any test edits — exploration confirmed every test referencing `BETA_MS` does so relatively, never
  hardcoding the literal 1h value.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None — this is a constant-value change with no spec-level requirement change. Confirmed against
  `decision-dashboard/spec.md` (pins only the no-data MESSAGE, not duration), `decision-narrative/spec.md`
  ("Cost-mitigation caching" already conceptually couples narrative-cache TTL to this window — recommendation
  keeps them coupled, so behavior matches the existing requirement), and `stream-windowing/spec.md` (its
  "Cuadro 1 β" is a structurally unrelated dimensionless candle-count, confirmed via repo-wide grep that
  `BETA_MS` is never imported by `src/laf/`, `src/stream/`, or `src/domain/`).

## Approach

Single constant-value change: `BETA_MS` from 1h to 8h, plus a one-line doc-comment cleanup. No consumer
code change needed — `app/api/cycle/route.ts:131` and `src/narrative/cache.ts:46` both pick up the new
value automatically via existing references/default parameters.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/cycle/constants.ts` | Modified | `BETA_MS` value 1h → 8h; doc-comment corrected |
| `app/api/cycle/route.ts` | None (consumer) | Picks up new TTL automatically, no edit |
| `src/narrative/cache.ts` | None (consumer) | Default TTL stays coupled to `BETA_MS`, no edit |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| TTL value (7h vs 8h) is a judgment call, no hard n8n scheduling-jitter data | Low | 8h chosen within user's authorized "~7-8h" range; asymmetric cost favors the larger margin (too-short TTL recurs the bug, too-long TTL only adds marginal staleness) |
| **[MANUAL-VERIFICATION-ONLY]**: no automated test can prove the production symptom is gone | High (standing) | Bug was only discoverable via live observation; `sdd-verify`/`sdd-archive` MUST NOT mark PASS without the user confirming live that the 503/404 dead window no longer occurs during a normal 6h cycle |

## Rollback Plan

Revert `BETA_MS` to its prior value via `git revert`; no downstream migration or data cleanup needed since
this is a pure in-memory TTL constant with no persisted state.

## Dependencies

- None — `n8n-cadence-6h` (the change that introduced this gap) is already applied and archived.

## Success Criteria

- [ ] `BETA_MS` = `8 * 60 * 60 * 1000`, doc-comment corrected to no longer reference Cuadro 1 β.
- [ ] All existing tests pass unchanged (zero test edits expected).
- [ ] `[MANUAL-VERIFICATION-ONLY]`: user confirms live in production that "Servicio momentáneamente no
      disponible" no longer appears during a normal 6h inter-run window.

## Proposal question round

Scope, root cause, and the TTL value were already fully decided in the binding scope handed to this
executor (user explicitly authorized "~7-8h", chose the bounded-TTL fix over no-expiry, and confirmed
keep-coupled for `narrative/cache.ts`). No open product decision remains for this proposal. Two points
carried forward from exploration as non-blocking notes for later phases:

1. 7h (~17% margin) remains a defensible tighter alternative to 8h if the user later prefers less
   staleness exposure — proceeding with 8h as recommended.
2. If a scheduled n8n run is missed by more than the TTL window, the dead-window bug recurs by design
   (bounded TTL, not infinite fallback) — accepted tradeoff per the user's chosen scope, not a defect.

**Assumption if unanswered**: proceed with 8h and the scope as specified above.
