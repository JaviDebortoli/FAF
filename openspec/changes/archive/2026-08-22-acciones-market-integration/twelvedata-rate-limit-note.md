# Exploration: twelvedata-rate-limit-batching

## Current State

`acciones-market-integration` (`openspec/changes/acciones-market-integration/`) is **not yet archived** — Phase E tasks E.10/E.11 in `tasks.md` are still unchecked `[ ]`. Live M4b manual verification (per `n8n/POST_IMPORT_STEPS.md`) fed 24 items into the acciones fetch node and got exactly 8 success + 16 `429` errors (Axios: "Try spacing your requests out using the batching settings under 'Options'"). The 8 successes were genuine Twelve Data `time_series` responses (GOOGL, AMZN, NVDA, META, BRK.B, XOM, WMT, PEP).

Root cause confirmed by direct read of the live `n8n/faf-workflow.json`: the acciones fetch node's `parameters.options` is exactly `{}` — no batching. Twelve Data's free "Basic" plan caps at 8 calls/minute. This was actually already known: `acciones-market-integration/exploration.md` documents "8 credits/min" and `proposal.md` even carries a risk row — but that risk row is written as "exhausted **if ticker universe grows**," missing that 24 tickers fired in one burst already blows the per-minute cap on the very first run.

n8n batching semantics verified against the official docs (docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest) and cross-checked against the repo's own crypto-branch node `notes`: **`batchSize`** = number of items grouped per batch (processed together); **`batchInterval`** (ms) = wait time **between** batches, not per-item, not a global rate. This matches the crypto node's own note verbatim ("the 1000ms interval... applies BETWEEN batches"). The proposed fix — `batchSize: 8, batchInterval: 60000` — is therefore semantically correct: 8 immediately, wait 60s, next 8, wait, final 8 ≈ 2 minutes total, comfortably inside the 6h cron cadence.

**Uncommitted rename diff confirmed live** (layered on top of committed Phase E commits `fb15e31`..`6bb7655`): all 9 renames the user described are present exactly as stated, including `Fetch Acciones Candles` → `Fetch Klines Acciones ` **with a confirmed trailing space** (present identically in both the node's own `"name"` and every `connections` reference to it — not a typo to silently fix). **The workflow is not broken**: n8n's export kept node names and `connections` keys in sync, and internal `$('...')` item-linking expressions were updated correctly too. The only staleness is cosmetic — several nodes' `notes` fields and all of `n8n/POST_IMPORT_STEPS.md` still use the old pre-rename names (pre-existing drift, unrelated to this bug, but worth fixing since M4b is being touched anyway).

## Affected Areas

- `n8n/faf-workflow.json` — `Fetch Klines Acciones ` node's `parameters.options` needs `batching.batch: {batchSize: 8, batchInterval: 60000}` (preserve the trailing space in the node name exactly).
- `n8n/POST_IMPORT_STEPS.md` — M4b (and M1/M2b/M5) reference stale pre-rename node names; should also note the acciones branch will now take ~2 minutes so the user doesn't mistake pacing for a hang.
- `openspec/changes/acciones-market-integration/tasks.md` — E.10/E.11 are the exact open manual-verification tasks this bug surfaced under.
- `openspec/changes/acciones-market-integration/proposal.md` — existing Twelve Data risk row is inaccurate as written (risk already manifested at current 24-ticker size, not only "if universe grows").

## Approaches

1. **Addendum to the still-open `acciones-market-integration` change** — fix inline, re-run M4b, archive once green. Mirrors this session's own precedent: `no-recommendation-filter-and-i18n`'s verify phase found one CRITICAL gap and fixed it via a 5th commit (`a1217c0`) on the *same* change, confirmed by reading its `verify-report.md`, not a new change.
   - Pros: change is provably still open; bug is a direct consequence of that change's own Twelve Data decision; keeps M4b in one place; smallest artifact surface; matches established repo precedent.
   - Cons: reopens a change already through Phases A–E; muddies the "5 commits, done" framing.
   - Effort: Low.

2. **New standalone change** (`twelvedata-rate-limit-batching`).
   - Pros: keeps `acciones-market-integration` frozen at 5 commits; own auditable trail.
   - Cons: contradicts the session's own established precedent; disproportionate process overhead for a ~5-line JSON change + doc update; splits E.10/E.11 verification bookkeeping across two changes.
   - Effort: Low (same fix, more overhead).

## Recommendation

Approach 1 is more consistent with this repo's established convention this session — but the user explicitly asked to "lanzar un flujo SDD," which is genuinely ambiguous between starting a fresh change and reopening/continuing the existing one. This is the one open question for the orchestrator to resolve with the user before `sdd-propose`; not decided here.

## Risks

- If routed as a new change while `acciones-market-integration` stays open, the two `tasks.md` files could drift on E.10/E.11 status — cross-reference whichever isn't chosen.
- The trailing space in `Fetch Klines Acciones ` is easy to lose in a programmatic edit — verify byte-for-byte before/after.
- `n8n/POST_IMPORT_STEPS.md`'s stale pre-rename names are pre-existing, unrelated drift — flag separately in case the user wants a scoped doc-sync pass instead of folding into this fix.
- Twelve Data's 8/min cap is a free-tier limit; a future plan upgrade would need `batchSize`/`batchInterval` retuning — worth a one-line note in the node's `notes` field.

## Ready for Proposal

Yes for the fix itself (self-contained, batching semantics independently verified). No for routing — resolve the addendum-vs-new-change question with the user first.

## Key Learnings

1. n8n's HTTP Request node `batchInterval` applies strictly between batches of `batchSize` items, not per-item or per-second, confirmed against official n8n docs.
2. Twelve Data's free Basic plan caps at 8 calls/minute, and 24 items fired without batching hits that cap on the very first execution, not only as ticker count grows.
3. The `acciones-market-integration` change remains open with tasks E.10/E.11 unchecked, so this bug surfaced directly inside that change's own manual-verification gate.
4. The live n8n workflow's uncommitted node renames, including a trailing space on `Fetch Klines Acciones `, are internally consistent and did not break any connection or expression.
5. This session's precedent for verify-discovered CRITICAL bugs is to fix them as an additional commit on the same still-open change rather than opening a new one.
