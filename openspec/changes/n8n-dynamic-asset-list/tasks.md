# Tasks: n8n Dynamic Asset List (single-pipeline refactor)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180-300 (single JSON node/connections replacement + one markdown rewrite) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Replace the 7 hardcoded nodes (3 Fetch, 3 Set, 1 Merge) with the 3-node linear pipeline in `n8n/faf-workflow.json`, replace `connections`, and rewrite `n8n/POST_IMPORT_STEPS.md`'s M-series | PR 1 | `node -e "JSON.parse(require('fs').readFileSync('n8n/faf-workflow.json','utf8'))"` plus the A1-A10 structural walkthrough (Phase 5 below) | N/A — no live n8n execution harness exists in this repo (design.md Testing Strategy) | `git checkout -- n8n/faf-workflow.json n8n/POST_IMPORT_STEPS.md` reverts both files; no other files touched |

**Delivery recommendation for the orchestrator**: single small JSON + one markdown file, same shape as the archived `n8n-cycle-merge-fix` change (~80-150 lines, single-PR, low risk). Recommend single-PR (or direct-to-main if that is the user's established preference for tiny scoped changes) — this is a recommendation, not a unilateral decision.

## Phase 1: Foundation — Symbols Node

- [x] 1.1 Add the `Symbols` Code node to `n8n/faf-workflow.json`'s `nodes` array, byte-exact per design.md: `id: "symbols-list"`, `type: "n8n-nodes-base.code"`, `typeVersion: 2`, `position: [90, 300]`, `jsCode` with the literal `['BTCUSDT','ETHUSDT','SOLUSDT']` array, the duplication-warning comment pointing at `src/market/assets.ts`, and `return SYMBOLS.map(...)` with `pairedItem: { item: 0 }`. `notes` carries the same cross-reference plus a "DO NOT RENAME" warning (Set Symbol references `$('Symbols')`).

## Phase 2: Node Replacement — Fetch Klines & Set Symbol

- [x] 2.1 Remove the 3 existing `Fetch Klines - {BTC,ETH,SOL}USDT` nodes, the 3 existing `Set Symbol - {BTC,ETH,SOL}USDT` nodes, and the `Merge Assets` node entirely from `nodes`.
- [x] 2.2 Add the single parameterized `Fetch Klines` node: `id: "fetch-klines"`, `httpRequest` `typeVersion: 4.2`, `position: [220, 300]`, top-level `onError: "continueErrorOutput"`, query params `symbol=={{ $json.symbol }}`, `interval=1h`, `limit=50`, `options.batching.batch = { batchSize: 50, batchInterval: 1000 }` (D4).
- [x] 2.3 Add the single `Set Symbol` node: `id: "set-symbol"`, `set` `typeVersion: 3.4`, `position: [350, 300]`, assignments `symbol = ={{ $('Symbols').item.json.symbol }}` (D3 — item linking, NOT `={{ $json.symbol }}`, because `Fetch Klines` overwrites `$json` with the Binance response body), `klines = ={{ $json.body ?? $json }}` (verbatim carry-over), `options: {}`.

## Phase 3: Rewiring & Untouched-Node Verification

- [x] 3.1 Replace `n8n/faf-workflow.json`'s entire `connections` object with the 5-edge linear chain: Schedule Trigger -> Symbols -> Fetch Klines -> Set Symbol -> Aggregate (build /api/cycle payload) -> POST /api/cycle, each `main: [[{node, type: "main", index: 0}]]`; `main[1]` on Fetch Klines deliberately absent (D5).
- [x] 3.2 Confirm `Aggregate (build /api/cycle payload)` node object (jsCode incl. stale "per-branch Set Symbol" comment per D6, notes, position `[610, 300]`) is left completely untouched — no edit.
- [x] 3.3 Confirm `POST /api/cycle` node object (credentials, `genericCredentialType`/`httpHeaderAuth`, placeholder URL, position `[870, 300]`) is left completely untouched — no edit.

## Phase 4: Documentation — `n8n/POST_IMPORT_STEPS.md` Rewrite

- [x] 4.1 Rewrite M1 to an import/topology check: import succeeds, 6 nodes render in one straight chain, no `Merge Assets` node, `Fetch Klines` shows 2 output pins with the error pin unconnected. Remove all `Merge Assets` references from the doc header/body.
- [x] 4.2 Keep the Header Auth credential creation content (currently M2) but renumber to M2; confirm the placeholder-URL step (currently M3) carries over verbatim to M... (renumber sequentially) since `POST /api/cycle` is byte-identical.
- [x] 4.3 Add/rewrite an execute-once/3-assets check step: `assets.length === 3`, 3 distinct symbols, non-empty candle arrays, `POST /api/cycle` returns 200 (also the array-splitting discriminator per design.md).
- [x] 4.4 Add/rewrite a single-symbol-failure + `pairedItem` sanity-check step: break one symbol in the `Symbols` node's array, confirm the execution does not abort, the other 2 assets are delivered, and each surviving symbol's `klines` plausibly matches its own price magnitude (not merely a count of 2). Replace the old M5 sentinel-fallback pointer with design.md's fallbacks A (`$('Symbols').itemMatching(...)`) / B (Code-node loop, requires a new SDD change) — do not improvise.
- [x] 4.5 Update the doc's design-doc cross-reference to `openspec/changes/n8n-dynamic-asset-list/design.md`; remove any remaining `n8n-cycle-merge-fix` path references.

## Phase 5: Automated Structural Self-Check (spec scenarios -> concrete checks)

- [x] 5.1 A1 — JSON validity: parse `n8n/faf-workflow.json`; every `connections` entry references an existing node id/name; names/ids unique. **PASS** — `node -e "JSON.parse(...)"` succeeds; all 5 connection sources and their targets resolve to existing node names; 6/6 names and 6/6 ids unique.
- [x] 5.2 A2/A3 (spec: "No Merge node exists" / "Node count is constant"): no node has `type: "n8n-nodes-base.merge"`; `nodes.length === 6`; exactly 3 nodes remain excluding Schedule Trigger, Aggregate, POST /api/cycle. **PASS** — `hasMerge=false`, `nodeCount=6`, remaining = `["Symbols","Fetch Klines","Set Symbol"]`.
- [x] 5.3 A4 (spec: "Fetch node is parameterized, not hardcoded"): exactly one `httpRequest` node fetching klines; its `queryParameters.symbol === "={{ $json.symbol }}"`; no symbol literal (e.g. `"BTCUSDT"`) anywhere in that node's parameters. **PASS** — count=1, `symbolValue = "={{ $json.symbol }}"`, `hasLiteral=false`.
- [x] 5.4 A5 (spec: "Symbol list matches the current asset allowlist"): `Symbols` node's literal array equals `src/market/assets.ts`'s `ASSET_ALLOWLIST` exactly (BTCUSDT, ETHUSDT, SOLUSDT); `notes` + `jsCode` comment reference `src/market/assets.ts`. **PASS** — `arrLiteral=["BTCUSDT","ETHUSDT","SOLUSDT"]` equals `ASSET_ALLOWLIST`; both `notes` and `jsCode` reference `src/market/assets.ts`.
- [x] 5.5 A6 (spec: "Topology is strictly linear" / "Success wiring is unchanged by error routing"): `connections` is exactly the 5-edge chain; `Aggregate` has exactly one inbound edge; `Fetch Klines` `main[0]` connects only to `Set Symbol`. **PASS** — 5 connection keys, all edges match the expected chain exactly; Aggregate's sole inbound edge is from `Set Symbol`.
- [x] 5.6 A7 (spec: "Fetch node routes errors off the main path"): top-level `onError: "continueErrorOutput"` present on `Fetch Klines`. **PASS** — `onError="continueErrorOutput"`.
- [x] 5.7 A8 (spec: "Batching is a no-op at N=3"): `options.batching.batch.batchSize >= 3` (or interval negligible at N=3). **PASS** — `batchSize=50, batchInterval=1000` (D4 values, 50≥3).
- [x] 5.8 A9 — byte-identity: diff `Aggregate` and `POST /api/cycle` node objects against `git show HEAD:n8n/faf-workflow.json`; must be byte-identical. **PASS** — `JSON.stringify` deep-equality check against `git show HEAD:n8n/faf-workflow.json` node objects: `aggregateByteIdentical=true`, `postByteIdentical=true`.
- [x] 5.9 A10 — no leaked secret path: no `$env`/`$vars` expression, no `x-faf-shared-secret` header-param entry anywhere in the file (prose mentions of `$env` in `notes` are exempt, per the `n8n-cycle-merge-fix` precedent). **PASS** — `hasEnvExpr=false` (checked for `{{...$env`/`{{...$vars` expression construct only, not prose substrings), `hasSecretHeaderParam=false` (the literal header param never appears; secret stays a credential reference).
- [x] 5.10 D3 verification (load-bearing): `Set Symbol`'s `symbol` assignment expression is exactly `={{ $('Symbols').item.json.symbol }}` — confirm it is NOT `={{ $json.symbol }}`. **PASS** — actual value is `={{ $('Symbols').item.json.symbol }}`, confirmed distinct from `={{ $json.symbol }}`.
- [x] 5.11 Record PASS/FAIL per check (5.1-5.10). If any check fails, fix the JSON/doc and re-run before proceeding; do not report done with a failing item. **11/11 PASS** (5.1-5.10 plus the underlying JSON-parse precondition) — full script + raw output kept in the apply-progress artifact and this report; no fixes were needed.

## Phase 6: Manual Verification Handoff (user, post-archive — not automatable here)

- [x] 6.1 Confirm `n8n/POST_IMPORT_STEPS.md`'s rewritten M-series is consistent with (not contradicting) the `notes` fields already embedded in the JSON nodes. Verified: M1 topology matches `Symbols`/`Fetch Klines`/`Set Symbol` notes; M2/M3 credential+URL steps match `post-cycle` notes verbatim; M4/M5 execute-once and failure-resilience checks match `Fetch Klines`/`Set Symbol` notes' error-routing and pairedItem descriptions.
- [x] 6.2 Explicitly flag to the user that 3 spec scenarios are `[MANUAL-VERIFICATION-ONLY]` and cannot be performed by `sdd-apply`/`sdd-verify` — no live n8n instance exists in this repo:
  - "Live cycle delivers all configured assets" (`POST /api/cycle`'s `assets` array contains all 3 symbols)
  - "Live cycle survives a single-asset fetch failure" (execution does not abort; remaining 2 assets still delivered)
  - "`pairedItem` metadata does not corrupt symbol/klines pairing" (each surviving item's klines pair with its correct symbol)
  These become the user's responsibility via `n8n/POST_IMPORT_STEPS.md` after this change is archived, same pattern as `n8n-cycle-merge-fix`.
