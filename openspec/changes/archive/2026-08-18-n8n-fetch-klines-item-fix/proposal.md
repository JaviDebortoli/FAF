# Proposal: Fix `Fetch Klines` array-splitting item explosion

## Intent

`POST /api/cycle` fails on **every** live cycle of the deployed app (https://faf-six.vercel.app) with
`400 "assets" length must be between 1 and 25`. Root cause (verified twice against n8n source,
`HttpRequestV3.node.ts`): `Fetch Klines` uses the default `responseFormat: 'autodetect'`, so n8n splits
Binance's 50-row kline array into **one item per kline row**, yielding N×50 items (200 for today's 4
symbols) instead of N. `MAX_ASSETS=25` correctly rejected the malformed payload — this is an n8n-JSON
defect, not an app defect. Success = every scheduled cycle returns 200 and the dashboard renders N cards.

## Scope

### In Scope
- `n8n/faf-workflow.json`: set `parameters.options.response.response.fullResponse = true` on `Fetch Klines` (single field).
- `n8n/POST_IMPORT_STEPS.md`: rewrite M4 so its **first** check is `Fetch Klines` outputs exactly N items (matching `Symbols` input count), **before** checking `assets.length` — catch regressions at the source node, not only at the final symptom.

### Out of Scope
- `Set Symbol`, `Aggregate`, `POST /api/cycle` node — unchanged. `Set Symbol`'s `={{ $json.body ?? $json }}` already anticipates the `fullResponse` shape.
- Any TypeScript app code. `MAX_ASSETS=25` / `isWellFormedAsset` are correct and MUST NOT be loosened.
- Approach A (`responseFormat: 'text'` + `JSON.parse()`) — **declined**: needs a downstream edit and adds a parse failure mode, with no advantage over C.
- Approach B (Code node + `this.helpers.httpRequest()`) — **declined**: whole-node rewrite, contradicts the `semantic-ingestion` "one parameterized HTTP Request node" requirement, carries n8n-Cloud-Starter helper flakiness risk, named "last resort" by `n8n-dynamic-asset-list/design.md`. Retained as fallback only if live test disproves `fullResponse`.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `semantic-ingestion`: the HTTP fetch node MUST emit exactly one item per configured symbol (one per HTTP call), never one per response array element.

## Approach

Approach C. `fullResponse: true` is evaluated before the array check and always pushes one item per call
(`{body, headers, statusCode, statusMessage}`), preserving `onError: continueErrorOutput` per-symbol
resilience and every property already proven in `n8n-dynamic-asset-list/design.md`. Zero downstream change.

**Urgency**: production is down. Fast-track spec/design/tasks/apply as one small slice; this does not need
the multi-phase treatment `dynamic-asset-count` required.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `n8n/faf-workflow.json` | Modified | `Fetch Klines` gains `options.response.response.fullResponse: true` |
| `n8n/POST_IMPORT_STEPS.md` | Modified | M4 gains source-node item-count check as its first assertion |
| `app/api/cycle/route.ts` | Unchanged | Validation boundary is correct as-is |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dot-path verified vs `master` source, not the user's live n8n 2.34.6 Cloud instance | Med | `sdd-design`/`sdd-apply` spot-check the exported node JSON before finalizing the literal patch |
| No automated n8n harness in repo | High (standing) | Structural verification + mandatory live M-series run |
| Live check skipped again, bug reaches prod undetected | Med | See open question below — `sdd-verify`/`sdd-archive` MUST NOT mark the live scenario compliant without explicit user confirmation it was run |

### Open question for the user (not decided here)

This exact failure mode was flagged as residual risk in **two** prior archived changes
(`n8n-dynamic-asset-list`, `dynamic-asset-count`), and both times the live-cycle-POST scenario was left
**PENDING at archive** with no forcing function — which is how this reached production. Should the project
adopt a stricter rule (e.g. a `[MANUAL-VERIFICATION-ONLY]` scenario blocks "fully complete" archival until
confirmed, or forces a `FUNCTIONALLY UNVERIFIED` flag that gates the next dependent change), or is the
current PENDING-at-archive pattern acceptable and this incident just bad luck? **Genuinely open — no
default chosen.**

## Verification Approach

No automated test harness exists for n8n JSON in this repo (same as prior n8n-only changes).
1. **Structural**: read/grep final JSON — `fullResponse: true` present at the exact verified path; no other node altered; JSON still valid and importable.
2. **Live M-series (mandatory, THIS TIME ACTUALLY COMPLETED)**: execute the real workflow → `Fetch Klines` emits exactly N items (not N×50) → deployed `/api/cycle` returns 200 → dashboard renders N cards.

`sdd-verify` / `sdd-archive` MUST NOT mark this change "safe"/complete on structural evidence alone.

## Rollback Plan

Remove the `fullResponse` key from `Fetch Klines`'s `options.response.response` object (or `git revert` the
commit) and re-import the workflow into n8n. Single-key change; no data migration, no app deploy involved.
Production is already broken, so rollback restores the current failing state, not a working one.

## Dependencies

- User access to the live n8n instance to re-import and execute the workflow once.
- Deployed app URL reachable with the Header Auth credential configured (M2/M3 already done).

## Success Criteria

- [ ] `Fetch Klines` outputs exactly N items per run, where N = `Symbols` node item count.
- [ ] `Aggregate` output has `assets.length === N` with N distinct symbols, each `klines` a full candle array.
- [ ] Live `POST /api/cycle` against the deployed app returns 200 (user-confirmed, not assumed).
- [ ] Dashboard renders N asset cards from a real scheduled cycle.
- [ ] `n8n/POST_IMPORT_STEPS.md` M4 checks source-node item count first.
- [ ] No change to `Set Symbol`, `Aggregate`, or any TypeScript file.
