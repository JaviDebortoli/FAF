# Design: n8n Dynamic Asset List (single-pipeline refactor)

## Technical Approach

Single-file structural edit to `n8n/faf-workflow.json`. The 3 hardcoded branches
(`Fetch Klines - {SYMBOL}` → `Set Symbol - {SYMBOL}`) and `Merge Assets` are deleted and replaced by
a linear, constant-node-count chain that exploits n8n's default per-item iteration: one Code node
emits N items, one HTTP Request node runs once per item, one Set node normalises each item.
`Aggregate (build /api/cycle payload)` and `POST /api/cycle` are carried over **byte-identical**.
No TypeScript changes — `src/market/assets.ts` and `app/api/cycle/route.ts` are untouched.

Total nodes: **6** (Schedule, Symbols, Fetch Klines, Set Symbol, Aggregate, POST). Excluding the
three unchanged endpoints, **3** remain — independent of symbol count, per the spec's first scenario.

## Data Flow

    Schedule Trigger ─→ Symbols ─→ Fetch Klines ──main[0]─→ Set Symbol ─→ Aggregate ─→ POST /api/cycle
       (1 item)         (N items)   (runs N times)  │        (N items)     (1 item)
                                                    └──main[1] ERROR pin (intentionally unconnected)

Per-item sequence for one cycle at N=3 (the loop is n8n's implicit per-item execution, not a node):

    Symbols  ──item 0 {symbol:"BTCUSDT"}──→ Fetch ──HTTP GET ?symbol=BTCUSDT──→ ok  → Set → item 0
             ──item 1 {symbol:"ETHUSDT"}──→ Fetch ──HTTP GET ?symbol=ETHUSDT──→ FAIL→ main[1], dropped
             ──item 2 {symbol:"SOLUSDT"}──→ Fetch ──HTTP GET ?symbol=SOLUSDT──→ ok  → Set → item 1
                                                                                       ↓
                                          Aggregate sees 2 items → assets:[BTC,SOL] → POST 200

The item that failed is caught **inside** the node's per-item loop; execution continues to the next
item. This is the same guarantee the 3 separate `onError` fields gave, at item granularity instead of
node granularity (exploration.md §3: n8n's node-builder error-handling pattern is a `for` loop with a
per-item `try/catch` that pushes to the error output and `continue`s; corroborated at runtime by
`n8n-io/n8n#30050`, whose only reported defect is downstream `pairedItem` metadata, not the routing).

## Architecture Decisions

| # | Decision | Chosen | Rejected alternative | Rationale |
|---|---|---|---|---|
| D1 | Item generation | Code node with a literal array | `Set` + `Split Out` (exploration Approach 2) | One fewer node for an identical result; matches this file's existing convention of using a Code node (`Aggregate`) for JSON-embedded logic |
| D2 | Symbol source of truth | Literal duplicate of `ASSET_ALLOWLIST`, cross-referenced in `notes` + `jsCode` comment | New `GET` allowlist endpoint the workflow calls | Locked by the proposal (Out of Scope); drift fails loud via `isAllowedAsset()` 400s, never silently |
| D3 | Symbol recovery at `Set Symbol` | `={{ $('Symbols').item.json.symbol }}` (n8n item linking) | `={{ $json.symbol }}` | **`$json` at the Set node is Binance's response, not the Symbols item** — the HTTP Request node replaces the item's `json` with the response body, so `$json.symbol` would be `undefined` and every asset would reach `/api/cycle` with a missing symbol. Item linking is the only mechanism that recovers it. See "Residual risk" below |
| D4 | Batching | `batchSize: 50`, `batchInterval: 1000` | `batchSize: 3` | 3 would couple the config to today's asset count, defeating the change's purpose; 50/1000 are n8n's own option defaults, so the file matches what the UI emits on re-export |
| D5 | Error pin | Left unconnected (`main[1]` absent from `connections`) | Sentinel Set node emitting `{symbol, klines: []}` | Preserves the merge-fix decision verbatim; there is no Merge node left that could wait on an empty input, so the fallback that decision pre-designed is now structurally unnecessary |
| D6 | `Aggregate` node | Carried over **byte-identical, including `notes` and the in-`jsCode` comment** | Reword "per-branch Set node" → "the Set node" | The proposal's success criterion pins `jsCode` byte-identity and the spec calls the node "unchanged"; the load-bearing claim the comment makes ("attached explicitly upstream, no positional item-order inference") stays exactly true. The stale word "per-branch" is an accepted cosmetic residual — recorded in Open Questions, not silently ignored |

## Interfaces / Contracts — exact JSON

### New node: `Symbols` (insert between Schedule Trigger and Fetch Klines)

`position: [90, 300]` sits on the file's existing 130-unit rhythm between `-40` and `220`.
`typeVersion: 2` and the omitted `mode` (default `runOnceForAllItems`) match the `Aggregate` node.

```json
{
  "id": "symbols-list",
  "name": "Symbols",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [90, 300],
  "notes": "Single source of this workflow's asset list. Emits one item per symbol; every downstream node runs once per item, which is why the pipeline needs no per-asset nodes and no Merge fan-in. DUPLICATION: this array mirrors ASSET_ALLOWLIST in src/market/assets.ts - n8n cannot import TypeScript and syncing via an endpoint was explicitly deferred (openspec/changes/n8n-dynamic-asset-list/proposal.md, Out of Scope). Edit one, edit the other; /api/cycle rejects unknown symbols with a 400 via isAllowedAsset(), so drift fails loud. Adding an asset also requires raising ASSET_ALLOWLIST/MAX_ASSETS app-side. DO NOT RENAME this node: 'Set Symbol' recovers each item's symbol through $('Symbols').",
  "parameters": {
    "language": "javaScript",
    "jsCode": "// Emits one item per allowlisted asset. Adding an asset = ONE array entry\n// here; node count and wiring never change (that is the point of this shape).\n//\n// DUPLICATION WARNING: this list mirrors ASSET_ALLOWLIST in\n// src/market/assets.ts. If you edit one, edit the other - /api/cycle rejects\n// unknown symbols with a 400 via isAllowedAsset(), so drift fails loud, not\n// silently. Syncing the two automatically is deliberately out of scope\n// (openspec/changes/n8n-dynamic-asset-list/proposal.md).\nconst SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];\n\n// pairedItem is stated explicitly: every symbol item derives from the single\n// Schedule Trigger item. This keeps n8n's item-linking chain complete for the\n// downstream $('Symbols').item back-reference in 'Set Symbol'.\nreturn SYMBOLS.map((symbol) => ({ json: { symbol }, pairedItem: { item: 0 } }));"
  }
}
```

### Replacement node: `Fetch Klines` (replaces all 3 `Fetch Klines - {SYMBOL}` nodes)

`onError` stays a **top-level** node property (sibling of `parameters`), exactly as the merge-fix
design established.

```json
{
  "id": "fetch-klines",
  "name": "Fetch Klines",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [220, 300],
  "onError": "continueErrorOutput",
  "notes": "Raw fetch only (D2). ONE node for every asset: n8n runs it once per input item, so the 'symbol' query value is the per-item expression {{ $json.symbol }} instead of a literal - adding an asset needs no new node. limit=50 matches the system's uniform per-cycle window (see faf-platform design.md 'Why 50'). onError routes a PER-ITEM Binance failure/rate-limit to this node's dedicated ERROR output pin (main[1]), left intentionally unconnected: n8n catches the failure for that item only and continues with the next, so main[0] simply yields no item for that asset while the others still reach /api/cycle - mirroring runCycle's 'skip a zero-candle asset, don't error' semantics. Batching is future-proofing only: at 3 items the whole list is one batch, so the 1000ms interval (which applies BETWEEN batches) never fires; the first throttle would appear at 51 symbols.",
  "parameters": {
    "method": "GET",
    "url": "https://api.binance.com/api/v3/klines",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        { "name": "symbol", "value": "={{ $json.symbol }}" },
        { "name": "interval", "value": "1h" },
        { "name": "limit", "value": "50" }
      ]
    },
    "options": {
      "batching": {
        "batch": {
          "batchSize": 50,
          "batchInterval": 1000
        }
      }
    }
  }
}
```

`url`, `method`, `interval` and `limit` are carried over unchanged from the deleted branch nodes;
only the `symbol` value and the `options` object differ.

### Replacement node: `Set Symbol` (replaces all 3 `Set Symbol - {SYMBOL}` nodes)

```json
{
  "id": "set-symbol",
  "name": "Set Symbol",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [350, 300],
  "notes": "Attaches this item's symbol plus the raw klines array under a stable 'klines' field, so the Aggregate Code node downstream never infers the asset from item order. The symbol CANNOT be read from $json here: the HTTP Request node upstream replaced each item's json with Binance's response. It is recovered by n8n item linking from the 'Symbols' node ($('Symbols').item), which resolves per item via pairedItem - so renaming 'Symbols' breaks this expression, and a mispairing would fail loudly rather than silently mislabel (see the M3 check in n8n/POST_IMPORT_STEPS.md).",
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "set-symbol-field",
          "name": "symbol",
          "value": "={{ $('Symbols').item.json.symbol }}",
          "type": "string"
        },
        {
          "id": "set-klines-field",
          "name": "klines",
          "value": "={{ $json.body ?? $json }}",
          "type": "array"
        }
      ]
    },
    "options": {}
  }
}
```

The `klines` expression is carried over **verbatim** from the deleted per-branch Set nodes.

### `connections` — full replacement block

```json
"connections": {
  "Schedule Trigger (1-5min)": {
    "main": [[{ "node": "Symbols", "type": "main", "index": 0 }]]
  },
  "Symbols": {
    "main": [[{ "node": "Fetch Klines", "type": "main", "index": 0 }]]
  },
  "Fetch Klines": {
    "main": [[{ "node": "Set Symbol", "type": "main", "index": 0 }]]
  },
  "Set Symbol": {
    "main": [[{ "node": "Aggregate (build /api/cycle payload)", "type": "main", "index": 0 }]]
  },
  "Aggregate (build /api/cycle payload)": {
    "main": [[{ "node": "POST /api/cycle", "type": "main", "index": 0 }]]
  }
}
```

Five edges, one per hop, no fan-out and no fan-in. `main[1]` (the Fetch error pin) is deliberately
absent — a trailing `[]` is legal but adds diff noise for zero behaviour, per the merge-fix decision.
`Aggregate` and `POST /api/cycle` keep their positions (`[610, 300]`, `[870, 300]`) so the two
byte-identical nodes stay byte-identical; the visual gap left by the removed Merge node is cosmetic.

## Re-confirmation of the three `n8n-cycle-merge-fix` properties

The proposal's #1 risk is that this restructuring silently regresses what the previous change fixed.
Each property is re-derived against the **new** node shape, not assumed to carry over.

### P1 — Partial-fetch resilience (was: 3 × `onError` on 3 nodes; now: 1 × `onError` on 1 node)

**Preserved, and equivalent — not weaker.** The old shape isolated failures at *node* granularity:
each branch had its own node, so a failing node aborted only its own branch. The new shape isolates
at *item* granularity on one shared node. These are the same guarantee because n8n's per-item
execution already is a loop: exploration.md §3 traces n8n's own node-builder error-handling pattern —
`catch (error) { if (this.continueOnFail()) { returnData.push({ json: { error }, pairedItem: { item: i } }); continue; } throw ... }`
— so a failure on item *i* is recorded on the error output and the loop proceeds to item *i+1*; the
node execution as a whole does **not** abort. `n8n-io/n8n#30050` independently corroborates this at
runtime: items do correctly diverge to the success and error outputs per item, and the only defect
reported there is downstream `pairedItem` traceability metadata, not the divergence itself.

Structurally the new shape is *strictly simpler* on this axis: the merge-fix's residual worry was
whether `Merge` would still complete when one input branch produced 0 items (its links 3–5, MEDIUM
confidence on version-specific edge cases). There is no Merge node any more and no multi-input node
anywhere, so that entire question — and its pre-designed sentinel fallback — is eliminated rather
than re-inherited.

Confidence: **HIGH** on the mechanism; the live confirmation is M3.

### P2 — Credential-based auth, no `$env`, no secret in the JSON

**Unaffected — stated explicitly rather than assumed.** `POST /api/cycle` is carried over
byte-identical: `authentication: "genericCredentialType"`, `genericAuthType: "httpHeaderAuth"`, the
top-level `credentials.httpHeaderAuth = { id: null, name: "FAF Cycle Shared Secret" }`, the literal
(non-expression) `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` URL, the `content-type` header entry, and
`jsonBody: "={{ JSON.stringify($json) }}"` all remain exactly as the merge-fix left them. This change
touches no node between `Aggregate` and the network boundary, introduces no `$env` or `$vars`
expression anywhere (the new `Symbols`/`Fetch`/`Set` nodes contain none), and adds no secret literal.
The `n8n shared-secret credential handling` requirement stays satisfied for the same reasons it was
before, with no new attack surface. Verifiable mechanically: the `post-cycle` node object must diff
clean against `git show HEAD:n8n/faf-workflow.json`.

### P3 — Error path separate from success path

**Preserved.** `onError: "continueErrorOutput"` gives `Fetch Klines` a second output pin; `main[0]`
(success) connects **only** to `Set Symbol`, and `main[1]` (error) connects to nothing. An item that
fails therefore never reaches `Set Symbol`, so `klines` can never be assigned an error object — the
crash mode the merge-fix explicitly rejected `continueRegularOutput` to avoid
(`Aggregate`'s `item.json.klines.map(...)` on a non-array). `main[0]` simply yields no item for that
symbol, and `Aggregate` builds the payload from whatever subset survived, mirroring `runCycle`'s
"skip a zero-candle asset, don't error" semantics. `alwaysOutputData` is not set anywhere, for the
same reason as before: it would emit a bare `{}` item that `Set Symbol` would turn into a non-array
`klines`.

Edge case (unchanged behaviour, not a defect): if **all** fetches fail, `Set Symbol` and `Aggregate`
receive 0 items and never execute, so no POST fires. If one somehow did, `parseCyclePayload` returns
a clean 400 — a logged failure, never corrupt data.

## Batching — concrete values and why they are a no-op at N=3

`options.batching.batch = { batchSize: 50, batchInterval: 1000 }` (n8n's own defaults for the HTTP
Request node's "Batching" option, so the committed JSON matches what the n8n UI produces and will not
churn on the user's next export).

- `batchSize: 50` ≥ 3, so today's whole symbol list is a **single** batch.
- `batchInterval: 1000` applies *between* batches; with one batch there is no "between", so the
  interval never fires and cycle latency is unchanged. The first throttle would appear at 51 symbols
  (one 1 s pause), far beyond `MAX_ASSETS`.
- Defensive note: even under the pessimistic reading where a future n8n version applied the interval
  before the first batch, the cost is one 1 s delay on a 2-minute schedule — harmless, never a
  dropped asset. This is why an interval-based no-op was chosen over `batchSize: 3`, which would have
  hard-coded today's asset count into the throttle config.

Satisfies the spec scenario "Batching is a no-op at N=3" via the `batch size ≥ 3` clause.

## Residual risk: `pairedItem` (D3) — the mechanism a live test must check

`Set Symbol` resolves `$('Symbols').item.json.symbol` through n8n's **item linking**: from the
current Set input item, n8n walks `pairedItem` backwards — Set item *k* → `Fetch Klines` output item
*k* → `Fetch Klines` input item *k* → `Symbols` output item *k* → `{ symbol: … }`. Every hop is
metadata n8n attaches automatically (the `Symbols` node sets its own `pairedItem` explicitly so the
chain has no gap).

Why it matters more here than in the merge-fix: previously each symbol was a **literal** in its own
Set node, so no back-reference existed. The new shape has exactly one Set node, and the HTTP Request
node overwrites each item's `json` with Binance's response, so the symbol *must* be recovered by
item linking. The back-reference is therefore load-bearing, and `n8n-io/n8n#30050` reports
`pairedItem` metadata degrading precisely when items diverge to an error output — which is exactly
what `onError: continueErrorOutput` does on a partial failure.

Two possible symptoms, in order of likelihood:

1. **Loud failure** — n8n raises "Paired item data for item from node 'Symbols' is unavailable" and
   the run stops at `Set Symbol`. Bad, but obvious and non-silent.
2. **Silent mispairing** — a surviving item receives another symbol's klines. This is the dangerous
   one and is what M3 must inspect: with a deliberately broken symbol, read `Aggregate`'s output and
   confirm each remaining `assets[i].symbol` matches klines whose price magnitude is plainly that
   asset's (e.g. BTC ≫ SOL), not just that the count is 2.

`Aggregate` itself stays clear of the bug class: it reads `item.json.symbol` / `item.json.klines`
directly with no `$('Node').item` back-reference of its own, so only the single `Set Symbol` hop is
exposed.

**Pre-designed fallback if M3 shows either symptom — do not improvise:**

- *Fallback A*: replace the `symbol` assignment with an explicit index re-pairing against the
  `Symbols` node's output (`$('Symbols').itemMatching(<current input index>)`), verifying the exact
  index-variable name against the running instance's expression documentation before editing.
- *Fallback B (last resort)*: move the fetch into a Code node that loops the symbol list and calls
  `this.helpers.httpRequest` per symbol inside a `try/catch`, keeping `symbol` and `klines` in the
  same object so no n8n item-linking metadata is involved. This **contradicts the current spec**
  ("one parameterized HTTP Request node MUST fetch klines") and therefore requires a new SDD change,
  not an ad-hoc edit.

Second, unrelated observation worth recording (a **pre-existing** property, not introduced here):
if n8n's HTTP Request node splits Binance's JSON *array* response into one item per kline row, then
`klines` would receive a single row rather than the full array — but that would have been equally
true of the three deleted branch nodes, which used the identical `={{ $json.body ?? $json }}`
expression with identical `options`. Behaviour is therefore unchanged in either direction, so it is
out of scope here; M2 discriminates it (an `assets` array of length 3, not 150). If M2 shows
splitting, the minimal fix is the fetch node's full-response option so the array stays in one item
under `.body` — which is precisely what the `?? $json` half of the existing expression anticipates —
and that is a separate change.

## File Changes

| File | Action | Description |
|---|---|---|
| `n8n/faf-workflow.json` | Modify | −7 nodes (3 Fetch, 3 Set, 1 Merge), +3 nodes (`Symbols`, `Fetch Klines`, `Set Symbol`); `connections` replaced with the 5-edge linear block. `Schedule Trigger`, `Aggregate`, `POST /api/cycle`, `active`, `settings`, `pinData`, `meta` untouched |
| `n8n/POST_IMPORT_STEPS.md` | Modify | Rewritten M-series (below) — the current M1/M5 reference the now-deleted `Merge Assets` node and its sentinel fallback |
| `openspec/specs/semantic-ingestion/spec.md` | Modify (at archive) | Delta already authored in `specs/semantic-ingestion/spec.md` |

## Testing Strategy

No live-n8n harness exists in this repo; the split is explicit and unchanged in spirit from the
merge-fix.

| Layer | What | Who |
|---|---|---|
| Structural (automated, `sdd-verify`) | A1–A10 | agent, from the JSON alone |
| Live execution | M1–M4 | user, in their n8n instance |

**A1** File parses as JSON; every `connections` key and every `{node: …}` target matches an existing
`nodes[].name`; all node `name`s and `id`s unique.
**A2** No node of type `n8n-nodes-base.merge`.
**A3** `nodes.length === 6`; excluding Schedule/Aggregate/POST exactly 3 remain.
**A4** Exactly one `n8n-nodes-base.httpRequest` node fetching klines; its `symbol` query value is
exactly `={{ $json.symbol }}`; no symbol literal (`BTCUSDT`/`ETHUSDT`/`SOLUSDT`) anywhere in its
`parameters`.
**A5** The only symbol literals in the file are inside the `Symbols` node's `jsCode`; its `notes`
and `jsCode` both mention `src/market/assets.ts`; the array equals `ASSET_ALLOWLIST` exactly.
**A6** `connections` is exactly the 5-edge chain above; `Aggregate` has exactly one inbound edge
(`Set Symbol`); `Fetch Klines.main[0]` targets only `Set Symbol`.
**A7** `Fetch Klines` has top-level `onError === "continueErrorOutput"`.
**A8** `options.batching.batch.batchSize >= 3` (and, if `batchInterval > 0`, `batchSize >= 3` is the
satisfying clause).
**A9** `Aggregate`'s whole node object — `jsCode` included — and the `post-cycle` node object are
byte-identical to `git show HEAD:n8n/faf-workflow.json`.
**A10** No `={{ $env… }}` / `$vars` expression anywhere; no `x-faf-shared-secret` header parameter;
no secret literal. (`post-cycle.notes` may still *mention* `$env` in prose — A10 targets the
expression construct, not the substring.)

**Manual (M1–M4)** — outline for the `n8n/POST_IMPORT_STEPS.md` rewrite, authored during apply:

- **M1 — Import and confirm the topology.** Import into n8n 2.34.6 with no import error. The canvas
  shows exactly 6 nodes in one straight chain, no `Merge Assets`, and `Fetch Klines` renders with two
  output pins (success + error) with the error pin unconnected.
- **M2 — Execute once, all 3 assets.** `Aggregate`'s output has `assets.length === 3` with the three
  distinct symbols and each `klines` a non-empty array of candle objects; `POST /api/cycle` → 200.
  (Also the discriminator for the array-splitting observation above: a length far greater than 3
  means the response was split per row, not per asset.)
- **M3 — Break one symbol; resilience + `pairedItem` sanity.** Temporarily set the `Symbols` array to
  an invalid ticker plus two valid ones and re-run. Confirm: the execution does **not** abort; the
  failed item appears on `Fetch Klines`' error output; `POST /api/cycle` still delivers the other 2
  assets; and — the `pairedItem` check — each surviving `assets[i].symbol` carries klines whose price
  magnitude plainly belongs to that asset. If either failure symptom above appears, apply the
  pre-designed fallback; do not improvise.
- **M4 — Credential and URL steps still apply unchanged.** `POST /api/cycle` is byte-identical to the
  pre-change file, so the two manual steps from `n8n-cycle-merge-fix` carry over verbatim: the Header
  Auth credential named exactly `FAF Cycle Shared Secret` (Name `x-faf-shared-secret`, Value = the
  real `FAF_CYCLE_SHARED_SECRET`) must be selected on the node, and
  `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` must be replaced with the real deployed origin. Re-importing
  the workflow resets both — re-apply them after every import.

## Threat Matrix

| Boundary | Applicability | Design response |
|---|---|---|
| Routing / shell / subprocess | N/A — no execution surface in this change |
| Executable-file classification | N/A — one JSON data file and one markdown file |
| Git / commit / push / PR automation | N/A — no VCS automation |
| **Secret handling (T-2, project row)** | **Applicable (inherited, unchanged)** | `POST /api/cycle` is carried over byte-identical; the secret stays an n8n credential reference `{id: null, name}`, never a value in this repo. A9 + A10 enforce it |
| **Outbound request target (T-2, project row)** | **Applicable** | The `symbol` query value is now an expression rather than a literal, but its only source is the `Symbols` node's hardcoded array — never request input, never `$env`. The `url` host stays the literal `api.binance.com`, so no expression can redirect the request |

## Migration / Rollout

No data or schema migration. Rollback: `git checkout -- n8n/faf-workflow.json` and re-import; the
`FAF Cycle Shared Secret` credential is unaffected in either direction. The user must re-import and
re-apply M4's two manual steps after this change lands.

## Open Questions

- [ ] Non-blocking, D6: `Aggregate`'s carried-over `jsCode` comment and `notes` still say
      "per-branch 'Set Symbol - {SYMBOL}' node". Byte-identity was chosen over accuracy because the
      proposal pins it; a one-line wording fix is a candidate follow-up change.
- [ ] Non-blocking: whether n8n splits Binance's array response into per-row items is a pre-existing,
      behaviour-neutral unknown, resolved empirically by M2 (see the residual-risk section).
