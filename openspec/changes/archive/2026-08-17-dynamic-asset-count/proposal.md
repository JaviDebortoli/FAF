# Proposal: Dynamic Asset Count (n8n payload as sole asset source)

## Intent

Asset identity and card count MUST be determined solely by what `POST /api/cycle` receives from n8n — same single-source-of-truth philosophy as the archived `n8n-dynamic-asset-list` change (no duplicated/hardcoded asset lists). Two couplings break this today: (a) enumerated `ASSET_ALLOWLIST` (3 symbols) 400s anything else at ingestion; (b) both GET read paths call `pullAllAssets()` on cache miss, independently re-fetching Binance for the allowlist — bypassing n8n on what `src/cycle/latest.ts` documents as the *common* serverless path.

## Scope

### In Scope
- Remove `ASSET_ALLOWLIST` / `AllowedAsset` / `isAllowedAsset` as an enumerated-membership concept (exploration Approach 1).
- `POST /api/cycle` boundary = existing `x-faf-shared-secret` (real trust boundary, from archived `n8n-cycle-merge-fix`) + per-symbol format regex `^[A-Z0-9]{2,20}USDT$`.
- New standalone `MAX_ASSETS = 25` (decoupled from list length). `MAX_KLINES_PER_ASSET` / `MAX_BODY_BYTES` unchanged.
- `BinanceHttpSource` T-2 SSRF guard uses the same format check.
- Remove `pullAllAssets()` call sites from `GET /api/decisions` and the narrative-route fallback: cache miss returns last cached n8n data (possibly empty), never an independent pull.
- Narrative `[asset]` param gated by format, not membership.
- Rewrite affected tests + new data-seeding strategy replacing pull-mode recompute.
- Design confirms whether `src/market/binance.ts#BinanceHttpSource` / `src/cycle/pullAssets.ts` become dead code (remove vs. retain for a future offline/test path).

### Out of Scope / Non-Goals
- `n8n/faf-workflow.json` — already N-capable; unchanged.
- No second source of truth: env-configurable allowlist (Approach 3) explicitly declined.
- No TypeScript union exhaustiveness for symbols — accepted, documented tradeoff (2 call sites, neither test-covered).
- Dashboard components unchanged beyond verifying the existing `EmptyState` covers zero decisions.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `semantic-ingestion`: ingestion accepts any well-formed USDT symbol under shared-secret auth; the "Symbol list matches the current asset allowlist" scenario no longer holds.
- `decision-narrative`: endpoint contract's "validated against the existing allowlist" becomes format validation; unknown-but-well-formed symbol yields "no decision", not `BAD_ASSET`.
- `decision-dashboard`: read path serves only n8n-pushed data; defined cache-miss empty state.

## Approach

Push-only ingestion. Trust boundary stays the shared secret; enumeration is replaced by shape + count caps. Read paths become pure cache reads.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/market/assets.ts` | Modified | List/union/predicate → format check + `MAX_ASSETS` |
| `app/api/cycle/route.ts` | Modified | `parseCyclePayload` format gate; standalone cap |
| `src/market/binance.ts` | Modified/Removed | Guard swap; possibly dead |
| `src/cycle/pullAssets.ts` | Removed? | No callers after pull-mode removal |
| `app/api/decisions/route.ts` | Modified | Cache-miss no longer pulls |
| `app/api/decisions/[asset]/narrative/route.ts` | Modified | Param gate + fallback |
| `tests/market/assets.test.ts`, `tests/api/cycle.test.ts`, `tests/api/decisions.test.ts` | Modified | Rewritten |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tests depending on pull-mode recompute break | High | Seed `src/cycle/latest.ts` cache directly in setup / test `runCycle` |
| Cache-miss empty state undefined | High | Explicit design decision (below) + `EmptyState` check |
| Typo'd symbol no longer 400s immediately | Med | Degrades into existing "zero-candle asset skipped" path — same failure philosophy |
| Loss of compile-time symbol narrowing | Low | Narrow blast radius; documented |
| Deviates from `faf-platform` design.md "one ingestion route, two data sources" | — | **Confirmed by user (2026-08-17): push-only ingestion is the new recorded architectural decision.** `design.md`'s original "one ingestion route, two data sources" statement must be superseded, not silently contradicted — `sdd-design` records this explicitly. |

## Resolved: Cache-Miss / No-Data UX (user decision, 2026-08-17)

A bare empty list is **not** acceptable. The user's exact words: *"Al usuario se le debe mostrar algo como 'Servicio momentáneamente no disponible' o algo así, igual de apropiado. El usuario final no conoce la arquitectura del sistema, ni n8n, ni de dónde provienen los datos."*

Binding requirements for `sdd-design`:
- When `GET /api/decisions` has no cached report (first deploy before n8n's first cycle, or a cache eviction with no data yet), the dashboard MUST show a **user-facing, architecture-agnostic** message — e.g. "Servicio momentáneamente no disponible" / "Sin datos disponibles en este momento" — never any wording that names n8n, "cache", "pull", "cycle", or otherwise exposes internal data-sourcing mechanics.
- This is a distinct state from the existing `EmptyState` component's original meaning (if that component's copy currently says something dashboard-context-appropriate like "no decisions match your filter", it is NOT interchangeable with "the backend has no data at all" — design must confirm whether `EmptyState` needs a new variant/copy, or whether a different component is warranted).
- Exact response shape (HTTP status, body) and exact copy are `sdd-design`'s job to finalize against this constraint — not a re-ask, but the constraint itself (user-facing, non-technical wording) is locked and not a design agent's discretion to loosen.

## Rollback Plan

Single revert of this change's commits restores `ASSET_ALLOWLIST`, the SSRF guard, and both `pullAllAssets()` call sites. No data migration, no persisted state, no n8n-side change to undo.

## Dependencies

- Archived `n8n-dynamic-asset-list` (workflow already N-capable) and `n8n-cycle-merge-fix` (shared-secret auth) — both landed.

## Success Criteria

- [ ] `POST /api/cycle` accepts N well-formed USDT symbols (N ≤ 25), including symbols never named in app source.
- [ ] Grep finds no enumerated asset allowlist anywhere in `src/`, `app/`.
- [ ] Neither GET read path fetches Binance; cache miss returns the defined empty report.
- [ ] `npx vitest run` and `npx tsc --noEmit` pass (Strict TDD Mode).
- [ ] Optional/nice-to-have: manual live n8n run with 4+ symbols renders N cards (not a completion gate).
