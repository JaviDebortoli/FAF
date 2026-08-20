# Design: Sync spec/docs/node-metadata to the manually-applied 6h n8n cadence

## Technical Approach

Documentation/config-text-sync change, no new components or architecture. The
n8n cadence itself was already changed manually in production (2min → 6h,
`active: false → true`); this design specifies the exact mechanical text
edits needed to bring the `Schedule Trigger` node's own metadata and four
repo docs/comments back into sync with that live config, per the proposal's
scope. `openspec/specs/semantic-ingestion/spec.md` is intentionally excluded
— that MODIFIED-requirement delta is `sdd-spec`'s concurrent output, not
duplicated here.

## Architecture Decisions

### Decision: Lead safety rationale with the `limit=50` arithmetic, not idempotency

**Choice**: In both the node `notes` and `architecture-notes.md`, state the
verified `limit=50` fetch-window margin (~6 new 1h candles per 6h cycle, ~44
margin) as the PRIMARY safety argument; keep `runCycle` idempotency
(`tests/cycle/idempotency.test.ts`) as a secondary backstop.
**Alternatives considered**: Keep idempotency as the primary/only argument
(the old framing).
**Rationale**: The old framing only held because 2min cadence was FINER than
the 1h candle (repeated calls hit an unchanged candle set — idempotency did
the real safety work). At 6h the cadence is COARSER than the candle: new
candles land every cycle, so the real safety guarantee is that the fetch
window covers the gap. Re-labeling idempotency as "still true, still
primary" would be factually backwards, not just under-emphasized.

### Decision: No automated cadence-value check

**Choice**: Do not add a test/CI check asserting the n8n JSON cadence value.
**Alternatives considered**: A script that parses `faf-workflow.json` and
fails CI if `hoursInterval` drifts from the spec's pinned value.
**Rationale**: Flagged in the proposal as a known recurring-drift risk (the
node name was already stale once before this change), but a dedicated n8n-
JSON content check is disproportionate for this change's scope. Left as a
future-work note, not a task here.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `n8n/faf-workflow.json` | Modify | `Schedule Trigger` node `name` + `notes` rewritten (interval/`active` already changed manually) |
| `docs/PRD.md` | Modify | Line 57 cadence value corrected |
| `docs/architecture-notes.md` | Modify | "Cron cadence vs. candle-close" section reworded to coarser-than-candle framing |
| `n8n/POST_IMPORT_STEPS.md` | Modify | Line 14 ASCII diagram label corrected |
| `tests/cycle/idempotency.test.ts` | Modify | Line 6 stale comment corrected (no assertion changes) |
| `openspec/specs/semantic-ingestion/spec.md` | Sibling (not this change) | MODIFIED Requirements delta for D2's cadence value — owned by the concurrently-running `sdd-spec` phase; not touched or duplicated here |

## Exact Text Content

### 1. `n8n/faf-workflow.json` — node at line 152 (`name`) and line 159 (`notes`)

`name` (was `"Schedule Trigger (1hr)"`):
```
"Schedule Trigger (6h)"
```

`notes` (full replacement string):
```
Per design.md D2: n8n stays cron+fetch only, no RDF-ification. Cadence is 6h, reduced from a finer interval specifically to cut n8n execution volume and budget spend (explicit cost-reduction decision). This coarser cadence is safe because Fetch Klines fetches limit=50 1h candles per cycle: at 6h between runs, only ~6 new hourly candles land per cycle, well within the 50-candle window (~44-candle safety margin) -- the fetch always covers the full gap since the previous run. As a secondary backstop, runCycle is also a pure function of its input candles (no wall-clock reads), so if a cycle ever runs against unchanged/already-processed candles, repeated /api/cycle calls are idempotent no-ops (tests/cycle/idempotency.test.ts), not a correctness risk.
```

Note: the node's connections-map key `"Schedule Trigger (1hr)"` (line 208)
MUST be renamed to `"Schedule Trigger (6h)"` in the same edit — n8n resolves
connections by node name, so the rename would break the workflow's single
edge (`Schedule Trigger` → `Symbols`) if the key is left stale.

### 2. `docs/PRD.md:57`

Was: `- Automatización: n8n con Schedule Trigger cada 1-5 minutos. `
```
- Automatización: n8n con Schedule Trigger cada 6 horas. 
```

### 3. `docs/architecture-notes.md` — replace the entire section (lines 3-36)

```
## Cron cadence vs. candle-close: why the 6h schedule doesn't need candle alignment (design.md D-B)

n8n's Schedule Trigger fires every 6 hours (reduced from a finer cadence to
cut execution volume and budget spend), while every indicator in this system
reads 1h candles (`beta=1` candle per Cuadro 1). This means each `/api/cycle`
invocation is now COARSER than the candle it reads, not finer as before — up
to ~6 new hourly candles can close between two consecutive runs.

This is safe by construction: `Fetch Klines` requests `limit=50` 1h candles
per cycle. Six new candles per 6h cycle is comfortably inside that window
(~44-candle safety margin), so every run's fetch always covers the full gap
since the previous run — no candle is ever missed because of the cadence.

Two ways to handle this were available:

1. **Align the cron cadence to candle-close** — trigger `/api/cycle` exactly
   when a new candle closes. Rejected: it couples n8n's scheduling to
   Binance's specific candle-close semantics (clock skew, exchange
   maintenance windows, multi-asset candles that don't necessarily close in
   lockstep), and it contradicts D2 (n8n stays "cron + fetch", no bespoke
   timing logic).
2. **Rely on the `limit=50` fetch window to absorb the gap** (the chosen
   approach) — the 6h cadence's ~44-candle margin over the ~6 candles
   produced per cycle means no gap-detection or alignment logic is needed.

As a secondary backstop, `runCycle` is also a pure function of its input
candles (see `src/cycle/runCycle.ts`): it reads no wall clock, and every
output timestamp is derived from the input candles themselves, never
`Date.now()`. So even if a cycle ever ran twice against the same candle set,
recomputing would be a correct, idempotent no-op
(`tests/cycle/idempotency.test.ts`) — not the primary reason the 6h cadence
is safe, but a guarantee that holds regardless.
```

### 4. `n8n/POST_IMPORT_STEPS.md:14`

Was: `Schedule Trigger (1-5min) -> Symbols -> Fetch Klines -> Set Symbol -> Aggregate (build /api/cycle payload) -> POST /api/cycle`
```
Schedule Trigger (6h) -> Symbols -> Fetch Klines -> Set Symbol -> Aggregate (build /api/cycle payload) -> POST /api/cycle
```

### 5. `tests/cycle/idempotency.test.ts` — replace comment block (lines 6-16)

```
// Codifies design.md's D-B decision explicitly: runCycle MUST be idempotent
// for byte-identical input regardless of n8n's polling cadence (now 6h,
// reduced from an earlier finer interval for budget reasons) -- recompute is
// always safe, by construction, because runCycle reads no wall clock and
// derives every output timestamp from the input candles themselves (see
// src/cycle/runCycle.ts's `latestTimestamp` / `computeCycleId`). This is the
// property that makes the presentation-only cache in src/cycle/latest.ts
// (task 6.2) safe: a cache MISS never changes the answer, only the latency.
// See docs/architecture-notes.md for the full rationale (the limit=50 fetch
// window covers the ~6 candles that land per 6h cycle; idempotency is the
// secondary backstop, not the reason the cadence is safe).
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `tests/cycle/idempotency.test.ts` still passes | No assertion changes — only the comment above the `describe` block is edited; run the existing suite to confirm it's still green |
| Static/text | All 5 edited files state "6h" consistently, no residual "1-5 min"/"1hr"/"2min" string | Manual grep/review during `sdd-verify` (no automated cadence-value check exists or is proposed here — see Architecture Decisions) |
| Production cadence | `[MANUAL-VERIFICATION-ONLY]`: the 6h Schedule Trigger actually fires at the intended interval in n8n Cloud | **Cannot be automated or CI-verified.** Per this repo's established manual-verification-gate norm (see `n8n-fetch-klines-item-fix`), `sdd-verify`/`sdd-archive` MUST NOT mark this scenario PASS without the user explicitly confirming a live 6h-interval production run. Treat as an unconfirmed scenario, not a failure, until that confirmation happens. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary. This change edits static
JSON metadata fields and Markdown/comment text only.

## Migration / Rollout

No migration required. The n8n interval/`active` config is already live;
this change only syncs repo text to match it. Rollback (if the cadence
decision itself is ever reversed) is `git revert` on the doc/spec/comment
commits plus a manual n8n re-import — out of scope here per the proposal.

## Open Questions

- [ ] None blocking. The proposal's advisory question round (exact `6h` vs.
      tolerance range; >44h missed-run gap handling; cost-reduction
      confirmation method) is explicitly non-blocking per the proposal, with
      stated default assumptions (pin exact `6h`; >44h gaps out of scope).
