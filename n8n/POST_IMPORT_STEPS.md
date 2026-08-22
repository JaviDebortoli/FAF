# Post-Import Manual Steps — `faf-workflow.json`

These steps are required after importing `n8n/faf-workflow.json` into your n8n instance. They mirror
the `notes` fields already embedded in the workflow's `Cripto Symbols`, `Fetch Klines Cripto`,
`Set Symbol Cripto`, `POST /api/cycle Cripto`, `Acciones Symbols`, `Fetch Klines Acciones`,
`Set Symbol Acciones`, and `POST /api/cycle Acciones` nodes — this document surfaces those same steps
in one place, it does not replace them. See `openspec/changes/n8n-dynamic-asset-list/design.md` for the
crypto-branch rationale and `openspec/changes/acciones-market-integration/design.md` for the
acciones-branch rationale.

## M1 — Import and confirm the topology

Import `n8n/faf-workflow.json` into n8n 2.34.6. There should be no import error, and the canvas
should show **11 nodes across two branches fanning out from one shared trigger**:

```
Schedule Trigger
  ├─> Cripto Symbols -> Fetch Klines Cripto -> Set Symbol Cripto -> Aggregate Payload Cripto -> POST /api/cycle Cripto
  └─> Acciones Symbols -> Fetch Klines Acciones -> Set Symbol Acciones -> Aggregate Payload Acciones -> POST /api/cycle Acciones
```

There is **no `Merge Assets` node** — the single-pipeline refactor removed it along with the 3
per-symbol `Fetch Klines - *` / `Set Symbol - *` branch nodes it used to fan in. `Fetch Klines Cripto`
and `Fetch Klines Acciones` each render with **two output pins** (success + error); the error pin on
both is intentionally left unconnected.

## M2 — Create the Header Auth credential

Create a **Header Auth** credential named exactly:

```
FAF Cycle Shared Secret
```

With:

- **Name**: `x-faf-shared-secret`
- **Value**: the real `FAF_CYCLE_SHARED_SECRET` value configured on your app deployment (see
  `.env.example`)

Confirm this credential is selected on the `POST /api/cycle Cripto` node. Also select it on
`POST /api/cycle Acciones` — both nodes share the exact same credential (one shared secret, two
independent pushes, per `acciones-market-integration/design.md`).

The secret itself is never stored in `faf-workflow.json` — n8n excludes credential values from
workflow JSON export. The committed file only carries a `{id: null, name: "FAF Cycle Shared Secret"}`
reference; n8n resolves it to your locally created credential by name on import. `POST /api/cycle
Cripto` is byte-identical to the pre-refactor file, so this step carries over verbatim.

## M2b — Create the Query Auth credential (Twelve Data)

Create a **Query Auth** credential named exactly:

```
Twelve Data API Key
```

With:

- **Name**: `apikey`
- **Value**: your real Twelve Data API key (obtain one at https://twelvedata.com/ — the free tier is
  sufficient for this workflow's 24-symbol, once-per-6h daily-candle request volume, PROVIDED the
  batching in M4b below is in place — see that section's rate-limit note)

Confirm this credential is selected on the `Fetch Klines Acciones` node. n8n appends `Name=Value` as a
query string parameter on every request made by that node, alongside the `symbol`/`interval`/
`outputsize` parameters already configured in the node's JSON — the API key itself is never stored in
`faf-workflow.json`, mirroring M2's shared-secret handling.

## M3 — Replace the placeholder URL

On the `POST /api/cycle Cripto` node, replace `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` in the `url` field
with your real deployed app origin. Re-importing the workflow resets this — re-apply it after every
import. `POST /api/cycle Acciones` points at the same deployed origin (`app/api/cycle/route.ts`
dispatches by the payload's `market` field, not by URL) — if you change one, change both.

## M4 — Execute once and confirm N assets (N = number of symbols in `Cripto Symbols`)

Execute the workflow once. Confirm, **in this order**:

1. **Source-node regression guard (check this FIRST, before anything downstream)**: `Fetch Klines
   Cripto`'s output item count equals `Cripto Symbols`'s input item count — i.e. exactly N items, one
   per configured symbol, **not** N × 50. This is the exact node where the `n8n-fetch-klines-item-fix`
   production incident originated (Binance's array-of-klines response was being split into one item per
   candle row instead of one item per symbol), so it must be checked at the source, not only inferred
   from the final payload. If you see N × 50 items here, the fix did not take — see the UI toggle check
   below before going further.
2. **UI toggle spot-check**: on `Fetch Klines Cripto`, confirm **Options → Response → Include Response
   Headers and Status** shows as **ON**. This is `options.response.response.fullResponse: true` in
   the JSON (`n8n-fetch-klines-item-fix` design.md) — the field that fixes check 1 above. If the JSON
   import did not correctly populate this toggle, re-enable it manually in the UI.
3. The `Aggregate Payload Cripto` node's output has `assets.length === N`, with N distinct
   symbols (matching `Cripto Symbols`'s configured list) and each `klines` a non-empty array of candle
   objects.
4. `POST /api/cycle Cripto` returns a 200 response.

If `assets.length` is far greater than N (e.g. N × 50), this confirms the same regression as check 1 —
n8n split Binance's array response into one item per kline row rather than one item per asset. This was
a documented pre-existing unknown (see the archived `n8n-dynamic-asset-list/design.md`'s "Residual
risk" section) that shipped to production before it was actually confirmed live; `n8n-fetch-klines-item-fix`
fixes it via check 2 above. If checks 1-2 both look correct but `assets.length` is still wrong, do not
improvise — open a new SDD change.

## M4b — [MANUAL-VERIFICATION-ONLY] Confirm the acciones branch (N = 24)

This is the gate `acciones-market-integration/design.md`'s Open Questions and `tasks.md` E.10/E.11
require before the branch is considered safe to run in production. Confirm, **in this order**:

1. **Source-node regression guard**: `Fetch Klines Acciones`'s output item count equals `Acciones
   Symbols`'s input item count — i.e. exactly 24 items, one per configured ticker, **not**
   24 × (candle count). **CONFIRMED live** (`twelvedata-rate-limit-batching`): a 24-item run produced
   exactly 24 output items (split across the success/error pins, never exploded) — Twelve Data's
   single-symbol response is a top-level JSON object, not an array, so `Fetch Klines Acciones`
   correctly does not need `options.response.response.fullResponse: true` the way `Fetch Klines
   Cripto` needs it for Binance.
2. **Rate-limit pacing (the actual issue found live)**: Twelve Data's free Basic plan caps requests at
   **8 calls/minute**. Firing all 24 items without pacing produces exactly 8 successes and 16 `429`
   errors ("Try spacing your requests out using the batching settings under 'Options'") — this was
   confirmed live before the fix below landed. `Fetch Klines Acciones` now has
   `options.batching.batch = {batchSize: 8, batchInterval: 60000}` (8 items per batch, 60s between
   batches — n8n applies `batchInterval` *between* batches, not per-item). With this in place, the
   branch takes **~2 minutes to complete** (3 batches of 8, 60s apart) — **this is expected pacing, not
   a hang**; it stays comfortably inside the 6h cron cadence. If you still see any `429`s after
   confirming this batching config is present in the imported workflow, your Twelve Data plan/limits
   may differ from the free Basic tier — reduce `batchSize` or increase `batchInterval` accordingly.
3. The `Aggregate Payload Acciones` node's output has `assets.length === 24`, with 24 distinct tickers
   (matching `Acciones Symbols`'s configured list) and each `klines` a non-empty array of candle
   objects with numeric `openTime`/`open`/`high`/`low`/`close`/`volume`.
4. `POST /api/cycle Acciones` returns a 200 response.
5. End-to-end: `/dashboard/acciones` on your deployed app shows real decisions for the pushed tickers,
   not the "no data yet" empty state.

Do not consider this change ready to archive as PASS until all 5 checks above are confirmed live —
this is the same manual-verification gate this session's `n8n-cadence-6h`/`cycle-cache-ttl-6h`/
`narrative-model-haiku` changes used.

## M5 — Break one symbol; resilience + `pairedItem` sanity check

Temporarily edit the `Cripto Symbols` node's `jsCode` array to include one invalid ticker (e.g.
`['INVALIDUSDT', 'ETHUSDT', 'SOLUSDT']`) and re-run the workflow. Confirm:

- The execution does **not** abort.
- The failed item appears on `Fetch Klines Cripto`'s error output pin (unconnected, so it is dropped,
  not propagated).
- `POST /api/cycle Cripto` still delivers the other 2 successfully-fetched assets.
- **`pairedItem` sanity check**: each surviving `assets[i].symbol` in the `Aggregate Payload Cripto`
  output carries klines whose price magnitude plainly belongs to that asset (e.g. BTC prices ≫ SOL
  prices) — not merely that the count is 2. This confirms `Set Symbol Cripto`'s
  `$('Cripto Symbols').item.json.symbol` expression (n8n item linking) did not silently mispair a
  surviving item with the wrong symbol.

Restore the `Cripto Symbols` array to `['BTCUSDT', 'ETHUSDT', 'SOLUSDT']` afterward.

**If either symptom below appears, do not improvise a fix** — apply one of the two pre-designed
fallbacks documented in `openspec/changes/n8n-dynamic-asset-list/design.md` under "Residual risk:
`pairedItem` (D3)":

- **Loud failure** (n8n raises "Paired item data ... unavailable" and the run stops at `Set Symbol
  Cripto`): apply **Fallback A** — replace the `symbol` assignment with explicit index re-pairing via
  `$('Cripto Symbols').itemMatching(<current input index>)`, verifying the exact index-variable name
  against your running instance's expression documentation before editing.
- **Silent mispairing** (a surviving item receives another symbol's klines): apply **Fallback A**
  first; if that does not resolve it, **Fallback B** (moving the fetch into a Code node loop with
  `try/catch`) is a last resort that contradicts this workflow's current "one parameterized HTTP
  Request node" design and requires a new SDD change, not an ad-hoc edit.
