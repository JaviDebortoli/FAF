# Post-Import Manual Steps — `faf-workflow.json`

These steps are required after importing `n8n/faf-workflow.json` into your n8n instance. They mirror
the `notes` fields already embedded in the workflow's `Merge Assets`, `Fetch Klines - *`, and
`POST /api/cycle` nodes — this document surfaces those same steps in one place, it does not replace
them. See `openspec/changes/n8n-cycle-merge-fix/design.md` for the full technical rationale.

## M1 — Import and confirm the Merge node

Import `n8n/faf-workflow.json` into n8n 2.34.6. There should be no import error, and the
`Merge Assets` node should render with 3 input pins.

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
reference; n8n resolves it to your locally created credential by name on import.

## M3 — Replace the placeholder URL

On the `POST /api/cycle` node, replace `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` in the `url` field with
your real deployed app origin.

## M4 — Execute once and confirm all 3 assets

Execute the workflow once. Confirm:

- The `Aggregate (build /api/cycle payload)` node's output has `assets.length === 3`, with 3 distinct
  symbols (BTCUSDT, ETHUSDT, SOLUSDT).
- `POST /api/cycle` returns a 200 response.

## M5 — (Recommended, optional) Single-asset failure resilience test

Temporarily break one Fetch node (e.g. use an invalid symbol) and re-run the workflow. Confirm:

- The execution does not abort.
- `POST /api/cycle` still delivers the other 2 successfully-fetched assets.

**If M5 hangs or blocks at the Merge node**, do not improvise a fix. Apply the pre-designed sentinel
fallback documented in `openspec/changes/n8n-cycle-merge-fix/design.md` under "Pre-designed fallback if
the manual test M5 shows a hang" — it connects each Fetch node's error pin (`main[1]`) to a small Set
node emitting `{ symbol: "<SYM>", klines: [] }` into the same Merge input index, verified app-side as
safe (`parseCyclePayload` has no `klines` minimum; `runCycle` skips zero-candle assets).
