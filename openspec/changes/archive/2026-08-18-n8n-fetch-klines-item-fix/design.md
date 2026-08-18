# Design: Fix `Fetch Klines` array-splitting item explosion

Fast-tracked production fix. Single-field JSON change; no architecture change.

## Technical Approach

Implements Approach C from `exploration.md`: set `parameters.options.response.response.fullResponse = true`
on the `Fetch Klines` node in `n8n/faf-workflow.json`. Per n8n's `HttpRequestV3.node.ts` source (`master`,
verified twice), this branch is evaluated **before** the array-split check and always emits exactly one
item per HTTP call (`{ json: { body, headers, statusCode, statusMessage } }`), regardless of whether the
response body is an array. No other node changes.

## Architecture Decisions

### Decision: `fullResponse: true` vs. `responseFormat: 'text'` vs. Code-node rewrite

| Option | Downstream edit needed | Diff size | Decision |
|---|---|---|---|
| C — `fullResponse: true` | None | 1 field | **Chosen** |
| A — `responseFormat: 'text'` + `JSON.parse()` | `Set Symbol.klines` | 1 field + 1 expression | Rejected — no advantage over C, adds parse-failure mode |
| B — Code node + `this.helpers.httpRequest()` | Full node rewrite | Whole node | Rejected — contradicts `semantic-ingestion` spec, drops declarative `onError`, named "last resort" in `n8n-dynamic-asset-list/design.md` |

**Rationale**: C is the smallest verified-safe blast radius and requires zero downstream change (see
Mechanism below).

## Exact JSON Diff — `Fetch Klines.parameters.options`

Before (`n8n/faf-workflow.json`, current):

```json
"options": {
  "batching": {
    "batch": {
      "batchSize": 50,
      "batchInterval": 1000
    }
  }
}
```

After:

```json
"options": {
  "batching": {
    "batch": {
      "batchSize": 50,
      "batchInterval": 1000
    }
  },
  "response": {
    "response": {
      "fullResponse": true
    }
  }
}
```

`batching` is preserved byte-identical and untouched; `response` is added as a new sibling key inside
`options`. No other field on this node, and no other node in the workflow, changes.

## Mechanism — Why `Set Symbol` Needs Zero Changes (crux of this fix)

`Set Symbol`'s existing `klines` assignment is `={{ $json.body ?? $json }}`. Today (bug state), `Fetch
Klines` emits one item per Binance array row with `json` equal to that raw row (no `.body` key) — so
`$json.body` is `undefined` on all 200 malformed items, and `?? $json` silently falls back to the raw
row itself. This is why the defect produced no type/shape error, only 200 tiny malformed "assets" instead
of a crash: the fallback masked the wrong shape.

With `fullResponse: true`, `Fetch Klines` emits exactly one item per HTTP call, shaped
`{ json: { body: <50-row kline array>, headers, statusCode, statusMessage } }`. Now `$json.body` is
defined and **is** the full 50-row array, so `$json.body ?? $json` evaluates to `.body` on its first
branch — the correct, intended path the expression was seemingly already written for. `Set Symbol`
requires no edit because it was already anticipating this exact shape; only `Fetch Klines`'s own output
shape was wrong.

## Live-Instance Spot-Check Caveat

The `options.response.response.fullResponse` dot-path was verified against n8n's `master`-branch GitHub
source (`HttpRequestV3.node.ts` / `Description.ts`) via two independent fetches, agreeing exactly — but
**not** against the user's live n8n 2.34.6 instance's actual UI/export behavior. After importing this
JSON change, the user MUST visually confirm in the n8n UI that `Fetch Klines`'s "Options → Response →
Include Response Headers and Status" toggle shows as **ON**. If the JSON import does not correctly
populate that toggle, the nested key structure needs adjustment — this is the live-instance spot-check
Risk #1 in `proposal.md` calls for, and it is the FIRST thing to check before running M4.

## File Changes

| File | Action | Description |
|---|---|---|
| `n8n/faf-workflow.json` | Modify | Add `options.response.response.fullResponse: true` to `Fetch Klines`; `batching` unchanged; no other node touched |
| `n8n/POST_IMPORT_STEPS.md` | Modify | Rewrite M4 (see below) |

## `n8n/POST_IMPORT_STEPS.md` M4 Rewrite Outline

New M4 order (source-node check first, symptom check second):

1. **Source-node regression guard (NEW, first check)**: execute the workflow once; confirm `Fetch
   Klines`'s output item count equals `Symbols`'s input item count (N = number of configured symbols),
   **not** N × 50. This catches the exact regression class of this incident at the node that caused it,
   not only at the final payload.
2. **UI toggle spot-check**: confirm the "Include Response Headers and Status" toggle is ON on `Fetch
   Klines` per the caveat above.
3. **Existing final-payload check** (kept, now second): `Aggregate`'s output has `assets.length === N`
   with N distinct symbols, each `klines` a full, non-empty candle array.
4. **Existing 200-check** (kept): `POST /api/cycle` returns 200.
5. Retain the discriminator note explaining that N × 50 items means the fix did not take (fullResponse
   not actually applied) — update the wording from the old fixed "3 assets" example to symbol-count-
   agnostic N, consistent with `dynamic-asset-count`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Structural | JSON validity + exact field presence | Read/grep final `faf-workflow.json`: `fullResponse: true` present at the verified path, `batching` unchanged, no other node diff |
| Live (manual, mandatory) | `Fetch Klines` item count == N; UI toggle ON; `assets.length === N`; live `POST /api/cycle` returns 200; dashboard renders N cards | Import into live n8n instance, execute once, per new M4 |

No automated test harness exists for n8n JSON in this repo (same precedent as `n8n-dynamic-asset-list`
and `dynamic-asset-count`).

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. This is a static JSON config field and a markdown doc edit.

## Migration / Rollout

Single-file n8n workflow JSON edit + one doc-file edit. No app code, no deploy, no test runner
applicable — same precedent as prior n8n-only changes. Verification is structural (grep/read the final
JSON) plus the now-mandatory live M4 check.

**Process rule (Engram id 1544, user-confirmed 2026-08-18)**: this change's live M4 scenario is
`[MANUAL-VERIFICATION-ONLY]`. Per the newly adopted rule, `sdd-verify`/`sdd-archive` MUST NOT mark this
change fully complete/PASS without the user's explicit confirmation that M4 was actually run live. If not
confirmed at archive time, the archive report MUST record status **"FUNCTIONALLY UNVERIFIED"**, not a
routine PASS — this is the forcing function this incident showed was missing twice before.

Rollback: remove the `response` key from `Fetch Klines.parameters.options` (or `git revert`) and
re-import. Single-key change, no data migration.

## Open Questions

- [ ] None blocking. Live-instance dot-path confirmation is tracked as the mandatory M4 spot-check
      above, not a design blocker.
