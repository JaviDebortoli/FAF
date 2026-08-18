# Post-Import Manual Steps — `faf-workflow.json`

These steps are required after importing `n8n/faf-workflow.json` into your n8n instance. They mirror
the `notes` fields already embedded in the workflow's `Symbols`, `Fetch Klines`, `Set Symbol`, and
`POST /api/cycle` nodes — this document surfaces those same steps in one place, it does not replace
them. See `openspec/changes/n8n-dynamic-asset-list/design.md` for the full technical rationale.

## M1 — Import and confirm the topology

Import `n8n/faf-workflow.json` into n8n 2.34.6. There should be no import error, and the canvas
should show exactly **6 nodes in one straight chain**:

```
Schedule Trigger (1-5min) -> Symbols -> Fetch Klines -> Set Symbol -> Aggregate (build /api/cycle payload) -> POST /api/cycle
```

There is **no `Merge Assets` node** — the single-pipeline refactor removed it along with the 3
per-symbol `Fetch Klines - *` / `Set Symbol - *` branch nodes it used to fan in. `Fetch Klines`
renders with **two output pins** (success + error); the error pin is intentionally left unconnected.

## M2 — Create the Header Auth credential

Create a **Header Auth** credential named exactly:

```
FAF Cycle Shared Secret
```

With:

- **Name**: `x-faf-shared-secret`
- **Value**: the real `FAF_CYCLE_SHARED_SECRET` value configured on your app deployment (see
  `.env.example`)

Confirm this credential is selected on the `POST /api/cycle` node.

The secret itself is never stored in `faf-workflow.json` — n8n excludes credential values from
workflow JSON export. The committed file only carries a `{id: null, name: "FAF Cycle Shared Secret"}`
reference; n8n resolves it to your locally created credential by name on import. `POST /api/cycle` is
byte-identical to the pre-refactor file, so this step carries over verbatim.

## M3 — Replace the placeholder URL

On the `POST /api/cycle` node, replace `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` in the `url` field with
your real deployed app origin. Re-importing the workflow resets this — re-apply it after every import.

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
