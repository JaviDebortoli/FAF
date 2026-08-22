# Archive Report: acciones-market-integration

**Archived**: 2026-08-22
**Status**: Complete — unconditional PASS, fully archived
**Code delivery**: Already committed and pushed to `main` prior to this archive phase — 7 commits: `fb15e31`, `a3bae2d`, `8ff3407`, `86e1ff5`, `6bb7655`, `215ca1b`, and verify-gate commit `f795944`. This phase performed no code commits, only spec-merge + archive-folder filesystem operations.

## Summary

This change makes Acciones (US-listed stocks, via Twelve Data) the platform's second real market, alongside crypto (Binance), proving the FAF architecture generalizes beyond a single always-on feed. All cost lived at the ingestion/cache/API boundary, which previously assumed exactly one market; the L1-L4 reasoning core (`src/stream/`, `src/laf/`, `src/decision/policy.ts`) required zero behavioral changes — confirmed asset-agnostic by an independent D3 zero-diff self-check.

1. **`Market` discriminator threaded end-to-end** — `market: 'crypto' | 'acciones'` added to `AssetKlines`, `Decision`, `DecisionReport`, `POST /api/cycle`'s payload (top-level field), `GET /api/decisions` (required `?market=` query param), and the narrative route (`?market=` query param).
2. **Market-keyed presentation cache** — `src/cycle/latest.ts` moved from a single global `CacheEntry` to `Map<Market, CacheEntry>`; a push for one market can never overwrite or affect the other market's cached entry (isolation independently unit-tested).
3. **Per-market symbol validation** — crypto keeps `ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/` unchanged; new `ACCIONES_SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/` covers US tickers with an optional single-letter share-class suffix (e.g. `AAPL`, `BRK.B`); `MAX_ASSETS = 25` enforced independently per market.
4. **Crypto migrated to daily candles (D1)** — `n8n/faf-workflow.json`'s `Fetch Klines` node interval changed `1h` → `1d` for cross-market consistency with Acciones' EOD granularity, a deliberate accepted change to crypto's live pipeline, explicitly signed off in the proposal.
5. **`BETA_MS` widened to 5 days (120h)** — sized to exceed the longest normal EOD gap either market can produce (a ~96h holiday weekend, plus margin for a missed 6h cron tick), so a routine weekend never spuriously flips either market to `ServiceUnavailable('no-data')`.
6. **`/dashboard/acciones` goes live** — `MARKETS.acciones.isReal` flipped to `true`; new `app/dashboard/(with-footer)/acciones/page.tsx`, a mechanical clone of `crypto/page.tsx`, replaces the prior `MarketPlaceholder`.
7. **n8n workflow** — one shared `Schedule Trigger` (6h, unchanged) now fans out to two branches: the existing crypto/Binance branch (retuned to `interval=1d`) and a new Acciones/Twelve Data branch (`time_series`, `interval=1day`, `outputsize=50`), each independently POSTing to `/api/cycle` tagged with its market. `src/market/twelvedata.ts` was deliberately NOT created (D-G) — n8n calls Twelve Data directly, mirroring how it already calls Binance directly (push-only ingestion).
8. **Rate-limit pacing fix (E.12, addendum)** — Twelve Data's free tier enforces an 8 req/min cap; the initial live run produced 8/24 successes and 16 rate-limit errors. Root-caused and fixed via commit `215ca1b` (`options.batching.batch = {batchSize: 8, batchInterval: 60000}` on the Acciones fetch node); re-run confirmed 24/24 success. Full investigation recorded in `twelvedata-rate-limit-note.md` (archived with this change as an addendum, not a separate change).

## Task Completion

**46/46 tasks complete at archive time.** Confirmed via a direct filesystem grep for `- [ ]` in `tasks.md` immediately before this phase's spec-sync/move work — zero matches. Per the `verify-report.md` (Engram observation #1769), Phase E's two `[MANUAL-VERIFICATION-ONLY]` gate items (E.10, E.11) and addendum fix E.12 were confirmed live by the user in this session (initial run 8/24 success plus 16 rate-limit errors; root-caused and fixed via commit `215ca1b`; re-run confirmed 24/24 success, `POST /api/cycle` Acciones returned 200, `/dashboard/acciones` showed real decisions). F.1-F.3 (final full-suite verification) are closed by the verify pass. No exceptional stale-checkbox reconciliation was needed — `tasks.md` already reflected final state when this archive phase began.

## Verify Verdict (per `verify-report.md`, Engram observation #1769)

**Verdict**: PASS — unconditional.

**CRITICAL**: 0
**WARNING**: 0
**SUGGESTION**: 3, all non-blocking, pre-existing documented follow-ups:
1. `src/market/twelvedata.ts` (D-G) remains an optional future-work item per design.md Open Questions.
2. `VALID_MARKETS`/`isMarket` guard duplicated across 3 route files (Next.js route-file export constraint, documented in Phase B apply-progress).
3. `n8n/POST_IMPORT_STEPS.md` node-name drift already resolved in commit `215ca1b`.

**Build**: `npx tsc --noEmit` — PASSED, 0 errors.
**Tests**: 322/322 passed (270 Vitest + 52 Playwright), 0 failed, 0 skipped — both suites re-run fresh in the verify pass, immediately preceded by a clean full-repo `npx tsc --noEmit`. All three exit codes confirmed 0.
**Spec compliance**: 41/41 scenarios compliant across 4 domains — `semantic-ingestion` (4 requirements, 22 scenarios), `decision-dashboard` (3 requirements, 8 scenarios), `market-navigation` (1 requirement, 5 scenarios), `decision-narrative` (1 requirement, 6 scenarios). Totals: 9 requirements, 41 scenarios. 39 scenarios verified via passing automated test; 2 verified via spec-declared non-automatable manual verification (TTL "normal inter-run window" scenario; n8n raw-forward/fetch structural scenario), both confirmed live by the user per E.10/E.11.
**D3 zero-diff self-check** (proposal's non-negotiable success criterion): `git diff a76a94d..HEAD --stat -- src/stream/ src/laf/ src/decision/policy.ts` → only `src/decision/policy.ts | 8 +++++++-` (7 insertions, 1 deletion) — `src/stream/` and `src/laf/` are empty diffs. The one `policy.ts` change is confirmed to be exactly the documented, deliberate exception (Phase A apply-progress Deviation 1): `decide()`'s return type annotation changes from `Decision` to `Omit<Decision, 'market'>`, plus a doc comment. Zero changes to `DecisionContext`, THETA/DELTA, `score()`, or any decision logic line. **Verdict on D3: PASS.**
**n8n workflow config review**: valid JSON, 11 nodes (6 original + 5 new), `Fetch Klines Acciones ` batching fix confirmed present, `Fetch Klines Cripto` interval = `1d` confirmed, both branches fan out from one unchanged `Schedule Trigger` (6h), all `connections` keys match node names exactly (including the trailing-space node). Structurally sound.
**TDD compliance**: 6/6 checks passed (TDD evidence reported, all tasks have tests, RED confirmed, GREEN confirmed via fresh re-run, triangulation adequate via multi-case truth tables, safety net present for modified files).

## Spec Sync

Four delta specs, MODIFIED + ADDED requirements, merged into the live main specs via targeted `Edit` block-replacement (matched by requirement heading, content copied verbatim from the delta specs' own final wording — read directly from `openspec/changes/acciones-market-integration/specs/*/spec.md` on disk, not paraphrased):

| Domain | Main spec | Requirement | Action | Details |
|---|---|---|---|---|
| semantic-ingestion | `openspec/specs/semantic-ingestion/spec.md` | Market-data fetch contract | MODIFIED | Fetch source now keyed by `market` discriminator: Binance (`interval=1d`) for crypto, Twelve Data `time_series` (`interval=1day`) for acciones; both EOD, both "always fetch last 50" |
| semantic-ingestion | `openspec/specs/semantic-ingestion/spec.md` | n8n scheduler-only role (D2) | MODIFIED | One shared 6h Schedule Trigger fans out to both market branches, each tagging its push with `market`; safety framing updated for EOD granularity across both branches (superseding the prior hourly-candle-specific ~44-candle-margin framing) |
| semantic-ingestion | `openspec/specs/semantic-ingestion/spec.md` | POST /api/cycle symbol validation contract | MODIFIED | Top-level `market` discriminator required; per-market symbol pattern dispatch (crypto unchanged, new acciones US-ticker pattern with share-class suffix); `MAX_ASSETS=25` enforced independently per market; unknown `market` value rejected with 400 |
| semantic-ingestion | `openspec/specs/semantic-ingestion/spec.md` | Market-keyed presentation cache | ADDED | New requirement: `src/cycle/latest.ts` maintains one cache entry per market; cross-market push isolation |
| decision-dashboard | `openspec/specs/decision-dashboard/spec.md` | Multi-asset display | MODIFIED | Tier 1 display now scoped to exactly one market at a time; card count follows that market's last push only; one market's cards never appear on another market's view |
| decision-dashboard | `openspec/specs/decision-dashboard/spec.md` | Crypto dashboard route under market navigation | MODIFIED | Every real market (`crypto`, `acciones`) now mounts its own Tier 1 overview at its canonical route, each scoped to only that market's decisions |
| decision-dashboard | `openspec/specs/decision-dashboard/spec.md` | Presentation-cache TTL survives the n8n inter-run gap | MODIFIED | `BETA_MS` now sized against both the 6h inter-run interval AND the longest normal EOD gap either market can produce (weekend-inclusive); added explicit "normal weekend gap does not flip to no-data" scenario |
| market-navigation | `openspec/specs/market-navigation/spec.md` | Per-market routing | MODIFIED | Now exposes one real-dashboard route per real market (`crypto` and `acciones`, both `MARKETS.{market}.isReal === true`) instead of `/dashboard/crypto` being the sole real route |
| decision-narrative | `openspec/specs/decision-narrative/spec.md` | Narrative endpoint contract | MODIFIED | Request now requires a `market` query parameter (400 if missing/invalid); asset symbol validated per the declared market's pattern; decision lookup scoped strictly to that market's cache entry, never falling back to or mixing with another market's cache |

All other requirements in each of the four main specs — not touched by this change's delta — were preserved unchanged (verified by `git diff --stat`: additive/targeted changes only, no unrelated deletions).

`git diff --stat` for the merge: `decision-dashboard/spec.md` +40/-23 (63 changed), `decision-narrative/spec.md` +27/-7 (34 changed), `market-navigation/spec.md` +14/-8 (22 changed), `semantic-ingestion/spec.md` +99/-37 (136 changed). Totals: 171 insertions, 84 deletions across 4 files.

## Mechanical Copy / Move Verification

Per the Mechanical Copy Contract, all filesystem operations used `git mv`/`cp -R` only; no artifact content passed through Read→Write. Text-merge edits (spec MODIFIED/ADDED-requirement block replacement) used targeted `Edit` on exact matched blocks, not full-file copies, per the skill's merge workflow (a text-merge operation, distinct from mechanical file copy).

**Archive folder move**: `git mv openspec/changes/acciones-market-integration openspec/changes/archive/2026-08-22-acciones-market-integration`, preceded by a recursive `cp -R` snapshot to a scratch directory for independent readback.

**`diff -r` readback (source snapshot vs. archived destination, archive-report.md excluded since it did not exist pre-move)**:
```
$ diff -r "$snapshot_root/source" "openspec/changes/archive/2026-08-22-acciones-market-integration"
(no output)
$ echo $?
0
```
Empty diff — byte-identical move confirmed. Source directory `openspec/changes/acciones-market-integration/` no longer exists (confirmed via `[ -e ... ] || [ -L ... ]` check before the diff, which found neither). Scratch snapshot removed after readback. `twelvedata-rate-limit-note.md` (the small addendum investigation document for this same change) moved with the rest of the folder as-is, with no special handling — confirmed present in both the pre-move snapshot and the archived destination, byte-identical.

## Archive Contents

- `proposal.md` ✅
- `design.md` ✅
- `exploration.md` ✅
- `specs/semantic-ingestion/spec.md` ✅ (delta, now merged into main spec)
- `specs/decision-dashboard/spec.md` ✅ (delta, now merged into main spec)
- `specs/market-navigation/spec.md` ✅ (delta, now merged into main spec)
- `specs/decision-narrative/spec.md` ✅ (delta, now merged into main spec)
- `tasks.md` ✅ (46/46 tasks complete)
- `apply-progress.md` ✅
- `verify-report.md` ✅ (unconditional PASS)
- `twelvedata-rate-limit-note.md` ✅ (addendum investigation document, archived as-is with the rest of the folder)
- `archive-report.md` ✅ (this file, written during archive)

## Source of Truth Updated

- `openspec/specs/semantic-ingestion/spec.md` now reflects: the `market` discriminator threaded through the fetch contract, n8n's two-branch scheduler role, `POST /api/cycle`'s per-market symbol validation (including the new acciones US-ticker pattern), and the new market-keyed presentation cache.
- `openspec/specs/decision-dashboard/spec.md` now reflects: market-scoped Tier 1 display, per-market dashboard routes (`crypto` and `acciones` both real), and the 5-day `BETA_MS` sized against both markets' normal EOD gaps.
- `openspec/specs/market-navigation/spec.md` now reflects: `/dashboard/acciones` as a second real-market route alongside `/dashboard/crypto`.
- `openspec/specs/decision-narrative/spec.md` now reflects: the narrative endpoint's required `market` query parameter and its market-scoped cache lookup.

## Traceability — Engram Observation IDs Read

- `sdd/acciones-market-integration/proposal` — observation #1761
- `sdd/acciones-market-integration/spec` — observation #1762
- `sdd/acciones-market-integration/design` — observation #1763
- `sdd/acciones-market-integration/tasks` — observation #1764
- `sdd/acciones-market-integration/verify-report` — observation #1769

(`exploration.md`, delta `specs/{semantic-ingestion,decision-dashboard,market-navigation,decision-narrative}/spec.md`, `apply-progress.md`, `tasks.md`, `verify-report.md`, and `twelvedata-rate-limit-note.md` were read directly from the filesystem, since this change's artifacts already existed on disk under hybrid mode.)

**Final-state note**: the Engram `sdd/acciones-market-integration/tasks` observation (#1764, created mid-session) shows Phase E's `[MANUAL-VERIFICATION-ONLY]` items (E.10, E.11) and Phase F (F.1-F.3) as unchecked `- [ ]` — this is a stale intermediate snapshot from apply time. The higher-ranked `verify-report` (observation #1769) and the on-disk `tasks.md` (fresh grep confirmed zero unchecked items at archive time) both confirm all 46/46 tasks, including E.10/E.11/F.1-F.3, are complete. This archive report reflects the final state per the Final-State Authority hierarchy, not the stale mid-session tasks snapshot.

## Native Review Receipt Gate

No `reviewGate` was reported for this candidate in the launch context (structurally absent — no populated value to check). Archive proceeded under ordinary repository policy, consistent with the gate's "kill switch off / no review ever started for this candidate" branch. No review transaction/ledger/receipt/gate-context topics were read, since none exist for this candidate.

## Risks / Open Items

None blocking archive. Carried forward for visibility only:

1. The 3 non-blocking SUGGESTIONs from `verify-report.md` (optional `twelvedata.ts` future work; duplicated `VALID_MARKETS`/`isMarket` guard across 3 route files; already-resolved `POST_IMPORT_STEPS.md` node-name drift) remain open as optional future hardening, not defects.
2. D1's crypto candle-interval migration (`1h` → `1d`) changes the live technical signal RSI/MACD/SMA/Bollinger compute over for crypto — this was a deliberate, explicitly signed-off proposal decision (not a bug), carried forward here only as a durable record of the behavior change for future reference.

## SDD Cycle Complete

The change has been fully planned (proposal, spec, design), implemented (apply, 5 phase batches across 5 chained PRs' worth of work landed on `main` via 7 commits), verified (unconditional PASS, 0 CRITICAL/0 WARNING, 41/41 scenarios compliant, D3 zero-diff self-check confirmed), and archived (4 spec deltas merged across 4 domains, folder moved, byte-identical `diff -r` confirmed, no stale tasks found). Code was already committed and pushed to `main` prior to this archive phase. This phase's filesystem changes (spec merges in `openspec/specs/{semantic-ingestion,decision-dashboard,market-navigation,decision-narrative}/spec.md` and the archive folder move) are staged via `git mv`/`Edit` and left for the orchestrator to review and commit separately.
