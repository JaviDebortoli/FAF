# Design: n8n Cycle Merge Fix

## Technical Approach

Single-file structural edit to `n8n/faf-workflow.json`: add one Merge node, rewire the 3-branch
fan-in through it, replace both `$env` expressions on `POST /api/cycle` (credential for the secret,
literal placeholder for the URL), and set `onError` on the 3 fetch nodes. No TypeScript changes —
`parseCyclePayload` (`app/api/cycle/route.ts:54`) already accepts 1–3 assets and imposes **no minimum**
on `klines`, and `runCycle` (`src/cycle/runCycle.ts:70`) already skips zero-candle assets.

## Data Flow

    Schedule ─┬─→ Fetch BTC ──main[0]─→ Set BTC ──→ Merge[0] ─┐
              │      └──main[1] (error pin, unconnected)      │
              ├─→ Fetch ETH ──main[0]─→ Set ETH ──→ Merge[1] ─┼─→ Aggregate[0] → POST /api/cycle
              │      └──main[1] (error pin, unconnected)      │
              └─→ Fetch SOL ──main[0]─→ Set SOL ──→ Merge[2] ─┘
                     └──main[1] (error pin, unconnected)

## Architecture Decisions

### Decision: Merge zero-item branch behavior (the one genuinely uncertain fact)

**Question**: does Merge (Append, `numberInputs: 3`) complete when one branch produced 0 items because
its `Fetch Klines` node routed to `continueErrorOutput`?

**Answer: yes — it completes with the surviving branches' items. Confidence: HIGH on the mechanism,
MEDIUM on 2.34.6-specific absence of edge cases.** Reasoning chain, each link stated with its own
confidence:

| Link | Claim | Confidence |
|---|---|---|
| 1 | `continueErrorOutput` makes the node **succeed**: it gains a 2nd output pin, error items go to `main[1]`, `main[0]` gets `[]`, workflow does not abort | High (documented, n8n ≥ 1.15.1) |
| 2 | A node whose only input receives 0 items is not executed and emits nothing (`alwaysOutputData` exists precisely to override this) | High (core n8n semantics) |
| 3 | Merge's docs say it "waits for the **execution** of all connected inputs" — not for *data*. The Fetch node **did execute**; the branch resolved-as-empty rather than staying pending | High |
| 4 | `WorkflowExecute` runs a multi-input node with the data it has once no remaining stack/waiting node can still deliver to a missing input | High (this is why the docs say "execution", not "data") |
| 5 | Merge v3 `mode/append.ts` iterates inputs `0..numberInputs-1` and concatenates; a connected-but-empty input contributes nothing | High |

**Choice**: rely on links 1–5; ship the minimal 1-node diff. Do **not** set `alwaysOutputData` anywhere
— it would emit a bare `{}` item, which `Set Symbol` would turn into `klines: {}`, crashing
`Aggregate`'s `item.json.klines.map(...)`.

**Alternatives considered / rejected**:
- `onError: "continueRegularOutput"` — **actively dangerous here**: the error item exits `main[0]`, so
  `Set Symbol` sets `klines = $json.body ?? $json` = the error object, and `Aggregate` calls `.map` on a
  non-array → hard crash. Rejected.
- Default `stopWorkflow` — current behavior, aborts all 3 assets. Rejected (this is the bug).

**Pre-designed fallback if the manual test M5 shows a hang** (do not implement now): connect each Fetch
node's `main[1]` error pin to a small Set node emitting `{ symbol: "<SYM>", klines: [] }` into the *same*
Merge input index, so every input always receives exactly 1 item. **Verified app-side as safe**:
`parseCyclePayload` has no `klines` minimum (`klines.every(isValidCandle)` is vacuously true on `[]`) and
`runCycle` skips zero-candle assets. Cost: +3 nodes. Rejected as primary only because it is a larger diff
for an unlikely failure mode.

### Decision: credential reference shape

**Choice**: generic Header Auth on the HTTP Request node — `parameters.authentication =
"genericCredentialType"`, `parameters.genericAuthType = "httpHeaderAuth"`, plus a **top-level**
`credentials` object (sibling of `parameters`) keyed by credential *type*, whose value follows n8n's
`INodeCredentialsDetails` = `{ id: string | null; name: string }`. `id: null` is the type-correct
"not yet resolved" value; n8n falls back to name matching on import.
**Alternatives**: omitting `credentials` entirely (type-only reference) — rejected, the spec requires a
*named* credential and the name must be self-documenting in git. Hardcoding an invented `id` string —
rejected, guarantees a stale-id mismatch.
**Worst case**: n8n shows the credential unresolved and the user re-picks it from the dropdown once —
already a required manual step, so it costs nothing.

### Decision: placeholder convention

**Choice**: literal (non-expression, no `=` prefix) URL string containing the token
`REPLACE_WITH_YOUR_DEPLOYED_APP_URL`, with the find-and-replace instruction in the node's n8n-native
`notes` field. JSON has no comments; `notes` survives import and is visible in the n8n UI.

## File Changes

| File | Action | Description |
|---|---|---|
| `n8n/faf-workflow.json` | Modify | +1 Merge node, 4 connection edges rewired, 3 `onError` fields, `POST /api/cycle` de-`$env`-ed |

## Interfaces / Contracts — exact JSON

**New node** (insert after `set-symbol-sol`, before `aggregate-payload`; `x=480` is the exact midpoint of
the existing 350→610 spacing, matching the file's 130-unit rhythm):

```json
{
  "id": "merge-assets",
  "name": "Merge Assets",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [480, 300],
  "notes": "Fan-in for the 3 per-asset branches. Without this, all 3 Set Symbol nodes fed the SAME Aggregate input and n8n's bare `items` global resolved to branch 0 only, silently dropping 2 of 3 assets every cycle. Append mode = flat concat of inputs 0..2 (Merge v3 mode/append.ts). A branch that produced 0 items (its Fetch node routed to its error output) contributes nothing and does not block the others.",
  "parameters": {
    "mode": "append",
    "numberInputs": 3
  }
}
```

`typeVersion: 3` (not 3.1/3.2) — `numberInputs` requires n8n ≥ 1.49.0; the instance is 2.34.6 and older
typeVersions stay supported. `mode` is stated explicitly even though it is the v3 default.

**`connections` — remove these 3 entries** (`Set Symbol - {BTC,ETH,SOL}USDT` → Aggregate) and **replace with**:

```json
"Set Symbol - BTCUSDT": { "main": [[{ "node": "Merge Assets", "type": "main", "index": 0 }]] },
"Set Symbol - ETHUSDT": { "main": [[{ "node": "Merge Assets", "type": "main", "index": 1 }]] },
"Set Symbol - SOLUSDT": { "main": [[{ "node": "Merge Assets", "type": "main", "index": 2 }]] },
"Merge Assets": { "main": [[{ "node": "Aggregate (build /api/cycle payload)", "type": "main", "index": 0 }]] }
```

`index` in a connection descriptor is the **destination input index**. All other `connections` entries
(Schedule→Fetch×3, Fetch→Set×3, Aggregate→POST) are unchanged.

**`onError` on all 3 `Fetch Klines - *` nodes** — a **top-level node property**, sibling of `parameters`
/ `position` / `notes` (same level as `retryOnFail`, `alwaysOutputData`, `executeOnce`, `disabled`), NOT
nested inside `parameters` or `settings`:

```json
{
  "id": "fetch-klines-btc",
  "name": "Fetch Klines - BTCUSDT",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [220, 140],
  "onError": "continueErrorOutput",
  "notes": "...existing note, plus: onError routes a Binance failure/rate-limit to this node's dedicated ERROR output pin (main[1]), left intentionally unconnected. main[0] then yields 0 items for that asset and the other assets still reach /api/cycle — mirroring runCycle's 'skip a zero-candle asset, don't error' semantics.",
  "parameters": { "...unchanged..." }
}
```

Leave the error pin unconnected: `"Fetch Klines - BTCUSDT": { "main": [[{ "node": "Set Symbol - BTCUSDT", "type": "main", "index": 0 }]] }` stays **byte-identical**. A trailing `[]` for `main[1]` is also
accepted by n8n but adds diff noise for zero benefit; do not add it.

**`POST /api/cycle` node** — replace `parameters.url`, drop the `x-faf-shared-secret` header entry, add
the two auth params and the top-level `credentials` block:

```json
{
  "id": "post-cycle",
  "name": "POST /api/cycle",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [870, 300],
  "notes": "MANUAL STEP 1 - replace REPLACE_WITH_YOUR_DEPLOYED_APP_URL in the url with your real deployed app origin. MANUAL STEP 2 - create a Header Auth credential named exactly 'FAF Cycle Shared Secret' with Name=x-faf-shared-secret and Value=<your FAF_CYCLE_SHARED_SECRET>, then select it here. T-2: the secret is NEVER stored in this JSON - n8n excludes credential values from workflow export. $env is not usable: n8n Cloud exposes no custom $env, and $vars requires Pro/Enterprise (this instance is Starter).",
  "parameters": {
    "method": "POST",
    "url": "https://REPLACE_WITH_YOUR_DEPLOYED_APP_URL/api/cycle",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [{ "name": "content-type", "value": "application/json" }]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify($json) }}",
    "options": {}
  },
  "credentials": {
    "httpHeaderAuth": { "id": null, "name": "FAF Cycle Shared Secret" }
  }
}
```

Note the `url` has **no leading `=`** — it is a literal string, not an expression. `sendHeaders` stays
`true` for `content-type`; the credential-injected header is merged with `headerParameters` at request
time. `Aggregate`'s `jsCode` and every other node are untouched.

## Testing Strategy

No live-n8n harness exists in this repo. Split is explicit:

| Layer | What | Who |
|---|---|---|
| Structural (automated, `sdd-verify`) | A1–A10 below, all readable from the JSON alone | agent |
| Live execution | M1–M5 below | user, in their n8n instance |

**Automated (A1–A10)** — `sdd-verify` MUST check all of these against `n8n/faf-workflow.json`:

1. File parses as JSON; every `connections` key and every `{node: ...}` target matches an existing
   `nodes[].name`; all node `name`s and `id`s unique.
2. Exactly one node with `type === "n8n-nodes-base.merge"`, `typeVersion === 3`,
   `parameters === {mode: "append", numberInputs: 3}`.
3. Each `Set Symbol - *` connects to the Merge node at a **distinct** index; the set of indices is
   exactly `{0,1,2}`.
4. No `Set Symbol - *` connects to `Aggregate (build /api/cycle payload)` any more.
5. Merge → Aggregate index 0, and it is Aggregate's **only** inbound edge.
6. `Aggregate`'s `jsCode` is byte-identical to `git show HEAD:n8n/faf-workflow.json`'s value.
7. All 3 `Fetch Klines - *` nodes have **top-level** `onError === "continueErrorOutput"`.
8. Each `Fetch Klines - *` `main[0]` still points only at its own `Set Symbol - *`.
9. `POST /api/cycle`: `authentication === "genericCredentialType"`,
   `genericAuthType === "httpHeaderAuth"`, top-level `credentials.httpHeaderAuth` exists with only
   `id`/`name` keys, `url` is a string not starting with `=` and containing
   `REPLACE_WITH_YOUR_DEPLOYED_APP_URL`.
10. The substring `$env` appears **nowhere** in the file; no `headerParameters` entry named
    `x-faf-shared-secret` remains.

**Manual (M1–M5)** — named steps for the user; M1–M4 gate "really done", M5 is the empirical check of
the one Medium-confidence claim above:

- **M1** Import into n8n 2.34.6; no import error; Merge renders with 3 input pins.
- **M2** Create the Header Auth credential (`FAF Cycle Shared Secret`, Name `x-faf-shared-secret`,
  Value = the real `FAF_CYCLE_SHARED_SECRET`) and confirm it is selected on `POST /api/cycle`.
- **M3** Replace `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` with the real deployed origin.
- **M4** Execute once: `Aggregate` output has `assets.length === 3` with 3 distinct symbols; POST → 200.
- **M5** *(recommended)* Temporarily break one Fetch node (invalid symbol) and re-run: execution does not
  abort and POST still delivers the other 2 assets. **If M5 hangs or blocks at Merge, apply the
  pre-designed sentinel fallback above** — do not improvise.

Edge case worth knowing (not a defect): if **all 3** fetches fail, Merge emits 0 items, `Aggregate` is
skipped, and POST never fires. If it somehow did fire, `parseCyclePayload` returns a clean 400
(`"assets" length must be between 1 and 3`) — a logged failure, never corrupt data.

## Threat Matrix

| Boundary | Applicability | Design response |
|---|---|---|
| Documentation-like paths | N/A — no file-classification or execution surface |
| Git repository selection | N/A — no VCS automation in this change |
| Commit state | N/A |
| Push state | N/A |
| PR commands | N/A |
| **Secret handling (T-2, project-specific row)** | **Applicable** — the shared secret moves from an unresolvable `$env` expression to an n8n credential | Credential values are excluded from workflow JSON export; the committed file carries only `{id: null, name}`. Automated check A10 (`$env` absent) + A9 (credential-by-reference) enforce it; no secret literal may ever enter this repo. |

## Migration / Rollout

No data or schema migration. Rollback: `git checkout -- n8n/faf-workflow.json`, re-import. The Header
Auth credential is harmless to leave in the n8n instance after a rollback.

## Open Questions

- [ ] None blocking. The Merge zero-item question is resolved to HIGH confidence with a pre-designed,
      app-verified fallback; M5 is its empirical confirmation and is explicitly a user-run step.
