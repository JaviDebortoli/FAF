# Exploration: n8n-fetch-klines-item-fix

## Current State

`n8n/faf-workflow.json` (post `n8n-dynamic-asset-list` + `dynamic-asset-count`): `Schedule Trigger` -> `Symbols` (Code node, emits N items, one per hardcoded symbol in `SYMBOLS` array, currently `['BTCUSDT','ETHUSDT','SOLUSDT','DOTUSDT']`) -> `Fetch Klines` (single `n8n-nodes-base.httpRequest`, typeVersion 4.2, `onError: "continueErrorOutput"`, GET `https://api.binance.com/api/v3/klines?symbol={{$json.symbol}}&interval=1h&limit=50`, `parameters.options` currently only sets `batching`; `responseFormat` is UNSET so defaults to `autodetect`) -> `Set Symbol` (`n8n-nodes-base.set`, `symbol: {{ $('Symbols').item.json.symbol }}`, `klines: {{ $json.body ?? $json }}`) -> `Aggregate (build /api/cycle payload)` (Code node, `toCandle(row)` does `Number(row[0..5])` per item, expects each item's `klines` to be the FULL 50-row Binance array) -> `POST /api/cycle` (credential auth, `MAX_ASSETS=25` server-side cap, `isWellFormedAsset` format gate — `app/api/cycle/route.ts`).

**Confirmed production bug**: Binance's `GET /api/v3/klines` returns a bare top-level JSON array (`[[ts,open,high,low,close,vol,...], ...]`, 50 rows). Under `responseFormat: 'autodetect'` (which resolves to `'json'` via the `application/json` content-type), n8n's HTTP Request node splits that array into one n8n item PER ARRAY ELEMENT rather than one item per HTTP call. For 4 symbols x 50 candles this produces 200 malformed items (1 kline row each) instead of 4 well-shaped items (50-row array each). `Set Symbol`'s `klines` field then receives a single kline row per item. `Aggregate` builds `assets: AssetKlines[]` with ~200 entries, which fails `POST /api/cycle`'s `MAX_ASSETS=25` cap with `400 "assets" length must be between 1 and 25` — exactly the reported error.

This exact failure mode was FLAGGED but never confirmed in two prior archived changes: `n8n-dynamic-asset-list/design.md` "Residual risk" section and `n8n/POST_IMPORT_STEPS.md` M2 (now M4) both explicitly named "if assets.length is far greater than 3 (e.g. ~150), n8n split Binance's array response into one item per kline row" as a pre-existing, behaviour-neutral unknown requiring live confirmation — which is precisely what happened. Both `n8n-dynamic-asset-list` and `dynamic-asset-count` archive-report.md files record the "Live cycle delivers all configured assets" scenario as **PENDING / user's post-archive responsibility** — it was never actually run against a real POST to a fully deployed app URL before this session (the `POST /api/cycle` node's `url` field was still the literal placeholder `REPLACE_WITH_YOUR_DEPLOYED_APP_URL` at both archive points). The user's earlier "El ciclo con 4 activos reales en n8n funciona bien" report is best explained as inspecting n8n's own execution canvas (e.g. item counts, no visible node errors) rather than a confirmed 200 from a real deployed `/api/cycle` enforcing `MAX_ASSETS` — this is the best-supported hypothesis, not proven fact, since no artifact records what exactly was checked in that earlier report.

## Affected Areas

- `n8n/faf-workflow.json` — `Fetch Klines` node's `parameters` (response-format handling) is the root-cause site; `Set Symbol`/`Aggregate` may need a compensating change depending on chosen approach
- `n8n/POST_IMPORT_STEPS.md` — M4 (execute-once check) already anticipates this exact failure mode and must be updated with the concrete fix + a discriminator for "fixed" vs "still splitting"
- `app/api/cycle/route.ts` — NOT touched by any candidate approach; `MAX_ASSETS=25`/`isWellFormedAsset` stay as the correct server-side boundary (they did their job — this is what caught the bug)
- No TypeScript app code is implicated; this is entirely an n8n-workflow-JSON-level fix

## n8n Mechanics — Verified Not Assumed

All claims below were verified against `n8n-io/n8n`'s actual source on GitHub (`packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts` and `.../V3/Description.ts`, `master` branch) via two independent fetches (the exploration sub-agent's own fetch, plus the orchestrator's own separate follow-up fetch of the same file), not inferred from memory or docs prose alone. Both fetches agree exactly.

1. **`HttpRequestV3.node.ts` explicitly covers typeVersion 3, 4, 4.1, 4.2, 4.3, 4.4, 4.5** (confirmed from the node's version-registration constructor) — so this file's logic governs `Fetch Klines`'s exact `typeVersion: 4.2`.
2. **Autodetect resolves to `'json'` for a `application/json` content-type response** (Binance's klines endpoint returns that content-type).
3. **The array-split branch, verbatim**:
   ```ts
   if (Array.isArray(response)) {
     response.forEach((item) => returnItems.push({ json: item, pairedItem: { item: itemIndex } }));
   }
   ```
   This only runs when `responseFormat === 'json'` AND `fullResponse === false` (the default).
4. **`fullResponse: true` short-circuits the split entirely — confirmed from the exact control-flow order**:
   ```ts
   if (!fullResponse) {
     response = optimizeResponse(response.body);
   } else {
     response.body = optimizeResponse(response.body);
   }
   ```
   The `fullResponse` branch is evaluated BEFORE any array check, and when true, pushes exactly ONE item per HTTP call: `{ json: { body, headers, statusCode, statusMessage }, pairedItem: { item: itemIndex } }`, regardless of whether `body` is an array.
5. **`'text'` and `'file'` response formats never split, regardless of array content** — both paths push exactly one item per call, `{ [outputPropertyName]: <raw text or binary> }`.
6. **Exact parameter dot-path for these options, confirmed from `Description.ts`** (nesting: `options` (collection) -> `response` (fixedCollection, name `response`) -> inner values object also named `response`), and independently re-confirmed via a direct fetch of the actual `getNodeParameter` call site:
   ```ts
   fullResponse = this.getNodeParameter('options.response.response.fullResponse', 0, false) as boolean;
   ```
   - `parameters.options.response.response.responseFormat` — options: Autodetect/File/JSON/Text, default `'autodetect'`
   - `parameters.options.response.response.fullResponse` — boolean, default `false`, displayName "Include Response Headers and Status"
   - `parameters.options.response.response.outputPropertyName` — string, default `'data'`, displayName "Put Output in Field" (only relevant for Text/File, not needed for the `fullResponse` fix)
   Flagged uncertainty: this nesting was verified against `master` branch source via two independent fetches (consistent both times) but NOT against a live n8n 2.34.6 instance's actual JSON export — `sdd-design`/`sdd-apply` should still spot-check the exported JSON shape from the user's real instance before finalizing the exact literal patch, per this repo's established norm of not asserting unverified instance-specific behavior.
7. **`itemIndex` in `pairedItem: { item: itemIndex }` is the loop index over the node's INPUT items** (0..N-1 for N symbols), not a sub-index within one response's array elements. This means every one of the 50 malformed sub-items from e.g. the BTC call all carry `pairedItem: {item: 0}`, tracing correctly back to `Symbols` item 0 (`BTCUSDT`) — **not** a random/shuffled mispairing. This is independently corroborated by the user's own pasted evidence: the 200-row output was cleanly grouped in 4 contiguous 50-row blocks by price magnitude (BTC block, ETH block, ~$75 block, ~$0.7-0.8 block), which is exactly what block-consistent `pairedItem` would produce — a shuffled/broken pairing would not produce clean per-symbol blocks. Conclusion (HIGH confidence, not a guess): the current bug is a **shape/count defect only** (200 single-row items instead of 4 full-array items), not a symbol-content mispairing defect — `Set Symbol`'s `$('Symbols').item.json.symbol` recovery is very likely still resolving the CORRECT symbol for every one of the 200 malformed items, it is just recovering it 50 times redundantly per asset instead of once. Recommended to still confirm live post-fix, but this de-risks the severity: no separate "silent data corruption" bug exists on top of the "too many items" bug.
8. **`this.helpers.httpRequest(options)` is a real, documented, community-corroborated Code-node capability**, NOT the same thing as raw `fetch`/`https`/`axios` (which n8n's Code-node sandbox explicitly blocks). Genuine residual uncertainty (not resolved by docs alone): n8n Cloud specifically has multiple community-reported instances of Code-node/HTTP-helper flakiness — this project's n8n instance is confirmed n8n Cloud **Starter** plan. This is a real operational risk for Approach B specifically, flagged rather than dismissed.
9. **The Code node has no declarative per-item `onError` pin the way `n8n-nodes-base.httpRequest` does.** In "Run Once for All Items" mode (the default, and the mode this workflow's `Symbols`/`Aggregate` nodes already use) a single thrown exception aborts the entire node's execution for ALL items, not just the failing one. The only way to reproduce the current `onError: continueErrorOutput` per-symbol resilience semantics inside a Code node is an EXPLICIT try/catch loop inside the code itself.

## Approaches Compared

### C — `fullResponse: true` on `Fetch Klines` (RECOMMENDED)
Flip one boolean: `parameters.options.response.response.fullResponse = true` (leave `responseFormat` at its default `autodetect`/`json`). Confirmed from source: this short-circuits the array-split branch entirely and always produces exactly one item per HTTP call, shaped `{ body, headers, statusCode, statusMessage }`.
- **Pros**: single-field diff on one existing node; keeps the declarative HTTP Request node (no rewrite); keeps native `onError: continueErrorOutput` per-item resilience exactly as-is (properties from `n8n-dynamic-asset-list/design.md` need zero re-derivation); **zero downstream change needed** — `Set Symbol`'s existing expression `={{ $json.body ?? $json }}` was seemingly written anticipating exactly this shape (`.body`) already, with `?? $json` as the non-fullResponse fallback; smallest possible verified-safe blast radius.
- **Cons**: none identified against A/B on mechanism; still needs the same live M-series re-confirmation as any fix, since no live n8n harness exists in this repo.
- **Effort**: Low (lowest of the three).

### A — `responseFormat: 'text'` + downstream `JSON.parse()`
Set `parameters.options.response.response.responseFormat = 'text'` on `Fetch Klines`. Confirmed: this also prevents the split. Raw response lands as a string under `outputPropertyName` (default `'data'`) unless set explicitly. `Set Symbol`'s `klines` expression would need to change to `={{ JSON.parse($json.data) }}`.
- **Pros**: also fully prevents the split, verified mechanism.
- **Cons**: requires a downstream edit (`Set Symbol`'s `klines` expression) that Approach C does not; adds a `JSON.parse()` failure mode not present in C; no functional advantage over C for this endpoint.
- **Effort**: Low-Medium.

### B — Replace `Fetch Klines` with a Code node using `this.helpers.httpRequest()`
Delete the HTTP Request node; add a Code node ("Run Once for All Items") that loops the N input symbol items, and for each does `try { const res = await this.helpers.httpRequest({...}); returnData.push({json:{symbol, klines:res}, pairedItem:{item:i}}); } catch { /* skip */ }`.
- **Pros**: fully deterministic — the node's output shape is 100% code-controlled; collapses `Fetch Klines` + `Set Symbol` into one node.
- **Cons**: largest diff of the three (whole-node rewrite); `symbol`/`klines` attached directly in code (safer than item-linking, but still a structural rewrite requiring the same category of live re-verification as `n8n-dynamic-asset-list`'s original migration); genuine, evidence-backed operational uncertainty specific to n8n Cloud Starter-plan (community-reported Code-node HTTP-helper flakiness); per-item resilience must be hand-rolled; explicitly named "last resort" by the prior change's own design doc, precisely because it "contradicts the current spec" (`semantic-ingestion` requires "one parameterized HTTP Request node MUST fetch klines").
- **Effort**: Medium-High.

No other undocumented "disable array splitting" toggle was found beyond `fullResponse`/`responseFormat` (Autodetect/JSON/Text/File) — these three parameters are the node's complete response-shaping surface.

## Recommendation

**Approach C (`fullResponse: true`)**. It is strictly smaller and lower-risk than A, and dramatically smaller and lower-risk than B, while fully and permanently fixing the confirmed root cause (verified against actual n8n source via two independent fetches, not assumed). It requires no change to `Set Symbol`, `Aggregate`, or any TypeScript app code, and it preserves every previously-verified property from `n8n-dynamic-asset-list/design.md` (partial-fetch resilience via `onError: continueErrorOutput`, credential handling, error-path separation) without needing to re-derive any of them. Approach B remains a documented fallback if a live n8n-instance test reveals `fullResponse` does not behave as the source predicts on this specific n8n 2.34.6 / Cloud Starter instance.

## Risks

- **No live n8n harness in this repo** (same standing limitation as both prior n8n changes) — the exact fix must be confirmed with a real execute-once run before being trusted.
- **Parameter dot-path (`options.response.response.fullResponse`) verified against `master`-branch GitHub source (twice, independently), not the user's actual running n8n 2.34.6 instance.** If the user's instance is on an older/different minor version with a different options schema, the literal JSON patch could need adjusting — `sdd-design`/`sdd-apply` should have the user spot-check the exported JSON before finalizing.
- **This exact failure mode was pre-flagged twice and still shipped to production unconfirmed.** The process gap — manual/live-only verification scenarios being marked PENDING at archive time with no forcing function to actually complete them before calling a change "done" — is a real recurring risk pattern in this project, worth a process note for `sdd-propose`/`sdd-tasks`, separate from this specific bug fix.
- **`MAX_ASSETS=25`/`isWellFormedAsset` app-side validation is NOT a risk here — it is what correctly caught this bug** and should not be loosened or worked around; any fix must make the n8n payload conform to that boundary, not the reverse.

## Ready for Proposal

Yes. Open questions for `sdd-propose`/`sdd-design`:

1. Confirm Approach C (recommended) vs. keep A/B as documented alternatives — any objection to the smallest-diff option?
2. Live-instance confirmation of the exact `fullResponse` parameter path before `sdd-apply` writes the literal JSON patch — who performs this, and when (before or after the JSON patch is authored)?
3. Should `n8n/POST_IMPORT_STEPS.md`'s M4 be rewritten with an explicit "if `assets.length` is still >> N, the fix did not take" discriminator, given this exact scenario already had such a discriminator once and it was insufficient to prevent the production incident?
4. Should this change also add a forcing function (e.g. a stated hard gate, not just a PENDING manual checklist item) so a future change cannot be archived as COMPLETE while its only real end-to-end confirmation remains unexecuted?
