# Exploration: n8n-dynamic-asset-list

## Current State

`n8n/faf-workflow.json` (post `n8n-cycle-merge-fix`): Schedule Trigger → 3 hardcoded parallel branches (`Fetch Klines - {SYMBOL}` HTTP Request, each with top-level `onError: continueErrorOutput` → `Set Symbol - {SYMBOL}`) → `Merge Assets` (`n8n-nodes-base.merge`, typeVersion 3, `{mode:"append", numberInputs:3}`, one distinct input index per branch) → `Aggregate` Code node (`items.map(item => ({symbol: item.json.symbol, klines: item.json.klines.map(toCandle)}))`) → `POST /api/cycle` (credential-based auth, literal placeholder URL). Adding N assets today = +2N nodes + Merge `numberInputs` bump — real, unbounded growth. `src/market/assets.ts` exports `ASSET_ALLOWLIST = ['BTCUSDT','ETHUSDT','SOLUSDT']`; no HTTP endpoint currently exposes it (checked all of `app/api/**/route.ts`). `app/api/cycle/route.ts` hard-caps `parseCyclePayload`'s `assets.length` at `MAX_ASSETS = ASSET_ALLOWLIST.length` (3 today) — independent ceiling from the n8n change.

## Affected Areas

- `n8n/faf-workflow.json` — the file this change restructures
- `src/market/assets.ts` — source-of-truth question (duplicate vs. sync with n8n)
- `app/api/cycle/route.ts` (`MAX_ASSETS`) — real scope boundary, must be addressed explicitly

## n8n Mechanics — Verified, Not Assumed

1. **Per-item iteration is automatic and default**: every node runs once per input item; no special flag needed (the "Execute Once" flag does the *opposite* — forces single execution on the first item only).
2. **Batching exists exactly for the rate-limit concern**: HTTP Request node's "Add Option → Batching" gives `Items per Batch` + `Batch Interval` (ms) — n8n's own docs describe it as equivalent to Loop Over Items + Wait.
3. **Per-item error isolation — CONFIRMED, HIGH confidence** (the crux question). n8n's own node-builder "Error handling" doc shows the canonical implementation: a `for` loop over items with a **per-item try/catch** — `catch(error) { if (this.continueOnFail()) { returnData.push({json:{error}, pairedItem:{item:i}}); continue; } throw ... }`. A failure on item 5 of 20 is caught and recorded; the loop continues to item 6 — the whole node execution does **not** abort. GitHub issue `n8n-io/n8n#30050` independently corroborates this at runtime (items do correctly diverge to success/error outputs per item; the only reported bug is downstream `pairedItem` traceability metadata, not the per-item routing itself). Conclusion: one HTTP Request node with `onError: continueErrorOutput` processing N items preserves the exact resilience property the just-fixed change achieved via 3 separate `onError` fields — equivalent, not weaker. Residual caveat: `Aggregate` reads `item.json.symbol/klines` directly (no `$('Node').item` back-reference), so it's unlikely to hit the `pairedItem` bug class, but this should be an explicit live-test item in design/verify (same discipline as the merge-fix's M5).
4. **N-items-from-a-list — 2 idiomatic patterns**: (a) single Code node, `return symbols.map(s => ({json:{symbol:s}}))`; (b) Set/Code producing one item with an array field → `Split Out` node (purpose-built, no-code, one item per array element). (b) costs one more node for identical outcome since the list is static.
5. **Expression scoping confirmed**: `={{ $json.symbol }}` on the HTTP Request node correctly sees each iteration's own item — this is default per-item behavior (Execute Once is off by default).

## Approaches Compared

### 1. Single Code node emits N items → 1 HTTP Request → 1 Set → Aggregate → POST
Single Code node emits N items → 1 HTTP Request (`={{ $json.symbol }}`, `onError: continueErrorOutput`, Batching) → 1 Set → Aggregate (unchanged) → POST. No Merge.
- **Pros**: fewest nodes (4 fixed, regardless of N); consistent with this repo's existing use of a Code node (`Aggregate`) for JSON-embedded logic.
- **Cons**: symbol list lives in a JS string, marginally less "visual."
- **Effort**: Low.

### 2. Set (list literal) → Split Out → 1 HTTP Request → 1 Set → Aggregate
- **Pros**: zero custom JS for list generation, self-documenting UI node.
- **Cons**: one extra node for the same outcome; doesn't change the source-of-truth question.
- **Effort**: Low (marginally higher).

## Recommendation

The user's proposed direction is **confirmed correct** against real n8n mechanics: a single-node-multi-item pipeline eliminates the Merge node entirely with no loss of the just-fixed partial-fetch resilience, via genuine per-item error isolation (not an assumption — traced to n8n's own error-handling implementation pattern and a corroborating GitHub issue).

Recommended concrete shape (**Approach 1**): Code-node symbol source → 1 parameterized HTTP Request (with Batching configured) → 1 Set → unchanged Aggregate → unchanged POST. Fewer nodes than Approach 2, same behavior, matches this workflow's existing convention of using Code nodes for JSON-embedded logic (as `Aggregate` already does).

## Risks

- **Symbol-list source of truth** (real fork, no default assumed):
  - (a) Duplicate literal in an n8n Code node — simplest, matches this workflow's own "cron+fetch only" design philosophy, but nothing enforces sync with `src/market/assets.ts` (footgun if the list changes without updating both places — fails loud via `isAllowedAsset()` 400s, not silently, but still an ops gap).
  - (b) n8n fetches the allowlist from a new small `GET` endpoint at cycle start — true single source of truth, but adds new app surface and turns this into an App+n8n change.
  - At this project's current solo-maintainer, 3-asset maturity, (a) is defensible but must be an explicit stated decision, not a silent default.
- **`MAX_ASSETS` / `parseCyclePayload` cap** — restructuring n8n alone does not let the system handle more than 3 assets end-to-end; `ASSET_ALLOWLIST` must also grow, or n8n will send symbols the app 400-rejects. The proposal must explicitly pick: n8n-only scope (workflow becomes N-capable; `ASSET_ALLOWLIST` expansion is a stated prerequisite/follow-up — recommended, smaller diff) vs. coordinated scope (bundle a small allowlist bump to prove it end-to-end, but pulls in app code + likely test-file updates).
- **Live-test gap**: like the merge-fix's M5, this change needs an explicit manual test breaking one symbol in an N>1 list to confirm the others still reach `/api/cycle`, and a confirmation that `Aggregate`'s lack of `$('Node').item` back-references keeps it clear of the `pairedItem` bug class (`n8n#30050`).

## Ready for Proposal

Yes. Open questions for the user to resolve in `sdd-propose`:

1. Scope: n8n-only (allowlist expansion out-of-scope/follow-up) vs. coordinated (bundle a small `ASSET_ALLOWLIST` bump)?
2. Symbol-list source of truth: literal duplicate vs. new endpoint the workflow calls?
3. Item-generation node: Code node (recommended) vs. Set→Split Out — any objection?
4. Configure Batching (Items per Batch/Interval) from day one, or defer until N actually grows large enough to matter?
5. Explicit manual live-test plan (M-series) including the `pairedItem` edge-case sanity check?
