# Post-Import Manual Steps — `faf-workflow.json`

These steps are required after importing `n8n/faf-workflow.json` into your n8n instance. They mirror
the `notes` fields already embedded in the workflow's `Symbols`, `Fetch Klines`, `Set Symbol`,
`POST /api/cycle`, `Acciones Symbols`, `Fetch Acciones Candles`, `Set Acciones Symbol`, and
`POST /api/cycle (Acciones)` nodes — this document surfaces those same steps in one place, it does not
replace them. See `openspec/changes/n8n-dynamic-asset-list/design.md` for the crypto-branch rationale
and `openspec/changes/acciones-market-integration/design.md` for the acciones-branch rationale.

## M1 — Import and confirm the topology

Import `n8n/faf-workflow.json` into n8n 2.34.6. There should be no import error, and the canvas
should show **11 nodes across two branches fanning out from one shared trigger**:

```
Schedule Trigger (6h)
  ├─> Symbols -> Fetch Klines -> Set Symbol -> Aggregate (build /api/cycle payload) -> POST /api/cycle
  └─> Acciones Symbols -> Fetch Acciones Candles -> Set Acciones Symbol -> Aggregate Acciones Payload -> POST /api/cycle (Acciones)
```

There is **no `Merge Assets` node** — the single-pipeline refactor removed it along with the 3
per-symbol `Fetch Klines - *` / `Set Symbol - *` branch nodes it used to fan in. `Fetch Klines` and
`Fetch Acciones Candles` each render with **two output pins** (success + error); the error pin on both
is intentionally left unconnected.

## M2 — Create the Header Auth credential

Create a **Header Auth** credential named exactly:

```
FAF Cycle Shared Secret
```

With:

- **Name**: `x-faf-shared-secret`
- **Value**: the real `FAF_CYCLE_SHARED_SECRET` value configured on your app deployment (see
  `.env.example`)

Confirm this credential is selected on the `POST /api/cycle` node. Also select it on
`POST /api/cycle (Acciones)` — both nodes share the exact same credential (one shared secret, two
independent pushes, per `acciones-market-integration/design.md`).

The secret itself is never stored in `faf-workflow.json` — n8n excludes credential values from
workflow JSON export. The committed file only carries a `{id: null, name: "FAF Cycle Shared Secret"}`
reference; n8n resolves it to your locally created credential by name on import. `POST /api/cycle` is
byte-identical to the pre-refactor file, so this step carries over verbatim.

## M2b — Create the Query Auth credential (Twelve Data)

Create a **Query Auth** credential named exactly:

```
Twelve Data API Key
```

With:

- **Name**: `apikey`
- **Value**: your real Twelve Data API key (obtain one at https://twelvedata.com/ — the free tier is
  sufficient for this workflow's 24-symbol, once-per-6h daily-candle request volume)

Confirm this credential is selected on the `Fetch Acciones Candles` node. n8n appends `Name=Value` as a
query string parameter on every request made by that node, alongside the `symbol`/`interval`/
`outputsize` parameters already configured in the node's JSON — the API key itself is never stored in
`faf-workflow.json`, mirroring M2's shared-secret handling.

## M3 — Replace the placeholder URL

On the `POST /api/cycle` node, replace `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` in the `url` field with
your real deployed app origin. Re-importing the workflow resets this — re-apply it after every import.
`POST /api/cycle (Acciones)` points at the same deployed origin (`app/api/cycle/route.ts` dispatches by
the payload's `market` field, not by URL) — if you change one, change both.

## M4 — Execute once and confirm N assets (N = number of symbols in `Symbols`)

Execute the workflow once. Confirm, **in this order**:

1. **Source-node regression guard (check this FIRST, before anything downstream)**: `Fetch Klines`'s
   output item count equals `Symbols`'s input item count — i.e. exactly N items, one per configured
   symbol, **not** N × 50. This is the exact node where the `n8n-fetch-klines-item-fix` production
   incident originated (Binance's array-of-klines response was being split into one item per candle
   row instead of one item per symbol), so it must be checked at the source, not only inferred from
   the final payload. If you see N × 50 items here, the fix did not take — see the UI toggle check
   below before going further.
2. **UI toggle spot-check**: on `Fetch Klines`, confirm **Options → Response → Include Response
   Headers and Status** shows as **ON**. This is `options.response.response.fullResponse: true` in
   the JSON (`n8n-fetch-klines-item-fix` design.md) — the field that fixes check 1 above. If the JSON
   import did not correctly populate this toggle, re-enable it manually in the UI.
3. The `Aggregate (build /api/cycle payload)` node's output has `assets.length === N`, with N distinct
   symbols (matching `Symbols`'s configured list) and each `klines` a non-empty array of candle
   objects.
4. `POST /api/cycle` returns a 200 response.

If `assets.length` is far greater than N (e.g. N × 50), this confirms the same regression as check 1 —
n8n split Binance's array response into one item per kline row rather than one item per asset. This was
a documented pre-existing unknown (see the archived `n8n-dynamic-asset-list/design.md`'s "Residual
risk" section) that shipped to production before it was actually confirmed live; `n8n-fetch-klines-item-fix`
fixes it via check 2 above. If checks 1-2 both look correct but `assets.length` is still wrong, do not
improvise — open a new SDD change.

## M4b — [MANUAL-VERIFICATION-ONLY] Confirm the acciones branch item count (N = 24)

This branch has **not** been confirmed against a live Twelve Data response yet — this check is the
gate `acciones-market-integration/design.md`'s Open Questions and `tasks.md` E.10/E.11 require before
the branch is considered safe to run in production. Confirm, **in this order**:

1. **Source-node regression guard**: `Fetch Acciones Candles`'s output item count equals
   `Acciones Symbols`'s input item count — i.e. exactly 24 items, one per configured ticker, **not**
   24 × (candle count). Unlike `Fetch Klines`, this node does **not** have
   `options.response.response.fullResponse: true` set — per this workflow's own `Fetch Klines`
   precedent, n8n only auto-splits a top-level JSON **array** response into multiple items; Twelve
   Data's `time_series` response for a single symbol is a top-level JSON **object**
   (`{meta, values, status}`), so no split should occur. If you see item counts other than 1-per-symbol
   here, the response shape assumption was wrong — enable **Options → Response → Include Response
   Headers and Status** on `Fetch Acciones Candles` (the `fullResponse: true` toggle) and change
   `Set Acciones Symbol`'s `klines` expression from `{{ $json.values }}` to
   `{{ $json.body.values }}` to match `Fetch Klines`/`Set Symbol`'s established fallback pattern.
2. The `Aggregate Acciones Payload` node's output has `assets.length === 24`, with 24 distinct tickers
   (matching `Acciones Symbols`'s configured list) and each `klines` a non-empty array of candle
   objects with numeric `openTime`/`open`/`high`/`low`/`close`/`volume`.
3. `POST /api/cycle (Acciones)` returns a 200 response.
4. End-to-end: `/dashboard/acciones` on your deployed app shows real decisions for the pushed tickers,
   not the "no data yet" empty state.

Do not consider this change ready to archive as PASS until all 4 checks above are confirmed live —
this is the same manual-verification gate this session's `n8n-cadence-6h`/`cycle-cache-ttl-6h`/
`narrative-model-haiku` changes used.

## M5 — Break one symbol; resilience + `pairedItem` sanity check

Temporarily edit the `Symbols` node's `jsCode` array to include one invalid ticker (e.g.
`['INVALIDUSDT', 'ETHUSDT', 'SOLUSDT']`) and re-run the workflow. Confirm:

- The execution does **not** abort.
- The failed item appears on `Fetch Klines`'s error output pin (unconnected, so it is dropped, not
  propagated).
- `POST /api/cycle` still delivers the other 2 successfully-fetched assets.
- **`pairedItem` sanity check**: each surviving `assets[i].symbol` in the `Aggregate` output carries
  klines whose price magnitude plainly belongs to that asset (e.g. BTC prices ≫ SOL prices) — not
  merely that the count is 2. This confirms `Set Symbol`'s `$('Symbols').item.json.symbol` expression
  (n8n item linking) did not silently mispair a surviving item with the wrong symbol.

Restore the `Symbols` array to `['BTCUSDT', 'ETHUSDT', 'SOLUSDT']` afterward.

**If either symptom below appears, do not improvise a fix** — apply one of the two pre-designed
fallbacks documented in `openspec/changes/n8n-dynamic-asset-list/design.md` under "Residual risk:
`pairedItem` (D3)":

- **Loud failure** (n8n raises "Paired item data ... unavailable" and the run stops at `Set Symbol`):
  apply **Fallback A** — replace the `symbol` assignment with explicit index re-pairing via
  `$('Symbols').itemMatching(<current input index>)`, verifying the exact index-variable name against
  your running instance's expression documentation before editing.
- **Silent mispairing** (a surviving item receives another symbol's klines): apply **Fallback A**
  first; if that does not resolve it, **Fallback B** (moving the fetch into a Code node loop with
  `try/catch`) is a last resort that contradicts this workflow's current "one parameterized HTTP
  Request node" design and requires a new SDD change, not an ad-hoc edit.
