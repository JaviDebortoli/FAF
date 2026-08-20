# Exploration: cycle-cache-ttl-6h — raise the presentation-cache TTL to match the 6h n8n cadence

## Current State

`src/cycle/latest.ts` is a module-scope in-memory cache (`entry: CacheEntry | null`) holding the single most recent `DecisionReport` POSTed by n8n. `put(report, ttlMs, atMs)` (line 34) stores `{ report, expiresAt: atMs + ttlMs }`; `get(atMs)` (line 39) returns `null` once `atMs >= entry.expiresAt` — an exclusive boundary. `app/api/cycle/route.ts:131` is the SOLE production writer: `cache.put(report, BETA_MS)`. `BETA_MS` (`src/cycle/constants.ts:7`) = `60 * 60 * 1000` (1h), doc-commented "beta (paper Cuadro 1): the 1h candle re-evaluation step. Reused as the presentation-cache TTL... (design.md D-B)".

Push-only ingestion (confirmed, `dynamic-asset-count` design.md "Supersession" section, NOT in scope to change here): `GET /api/decisions` and the narrative route are pure readers. A cache MISS is a DEFINED no-data state, never a recompute.

`n8n-cadence-6h` (already archived) moved the Schedule Trigger from 2min to 6h but did not touch `BETA_MS`. Result: cache now expires 1h after every push, leaving a ~5h dead window in every 6h cycle where reads 503/404.

### Exact no-data trace (traced end-to-end, confirms user's screenshot symptom)

- `app/api/decisions/route.ts:24-30`: `cache.get()` returns `null` → `503 { error: 'Service temporarily unavailable', code: 'NO_DATA' }`, `Retry-After: 30`.
- `app/api/decisions/[asset]/narrative/route.ts:182-184`: `cycleCache.getForAsset(asset)` (delegates to the same `get()`) returns `null` → `404 { code: 'NO_DECISION' }`. Same root cause, same fix.
- Client: `app/(dashboard)/components/OverviewClient.tsx`'s `poll()` sees `response.status === 503` → `markUnavailable('no-data')` (line 72-74) → `<ServiceUnavailable reason="no-data" />` renders "Servicio momentáneamente no disponible" (`app/(dashboard)/components/ServiceUnavailable.tsx:27`). Confirmed: this IS the exact component/copy in the user's report.
- Nuance found: `markUnavailable` (line 54-57) only transitions to `unavailable` when `prev.kind !== 'ready'` — a browser tab that stayed open through a successful load keeps showing the last `ready` report on a transient poll failure (sticky-by-design, from `dashboard-ux`). This does NOT protect the user in practice because `viewState` resets to `{ kind: 'loading' }` on every fresh page load/refresh/new-tab (line 41) — and the SERVER-side cache has genuinely expired (not a client artifact), so any page load landing in the ~5h dead window gets a real 503 with nothing to fall back on. This is why manually re-triggering n8n was the only recovery: no stale data exists anywhere to serve, client or server.

### Scope confirmation

User explicitly chose "raise TTL to ~7-8h" over "remove TTL/expiry entirely," despite the latter more literally matching their stated intent ("show last-known data until an update occurs"). The chosen approach still expires eventually (protects against showing arbitrarily stale data if n8n truly stops running) — it only widens the window to match the new 6h cadence instead of the stale 1h assumption. This exploration targets that scope only; it does not evaluate or recommend the no-expiry alternative.

## Affected Areas

- `src/cycle/constants.ts:7` — `BETA_MS` value must change (the actual fix).
- `app/api/cycle/route.ts:131` — consumer of `BETA_MS`, no code change needed, picks up the new value automatically.
- `src/narrative/cache.ts:46` — `put(..., ttlMs: Millis = BETA_MS, ...)` — default TTL also currently equals `BETA_MS`. Real design question below.
- `openspec/specs/decision-narrative/spec.md:57-58` — "Cost-mitigation caching" requirement literally couples narrative-cache TTL to the decision cache's window ("valid within the same window the decision itself is cached (β, mirroring `src/cycle/latest.ts`'s put/get/ttl pattern)"). Relevant to the design question below.
- No other production code path references `BETA_MS` (confirmed via repo-wide grep: only `app/api/cycle/route.ts`, `src/cycle/constants.ts`, `src/narrative/cache.ts`, `tests/narrative/cache.test.ts`).

## Design Question: should `src/narrative/cache.ts`'s default TTL stay coupled to `BETA_MS`, or be decoupled into its own constant?

**Recommendation: keep it coupled (no code change to `narrative/cache.ts` — it inherits the bumped `BETA_MS` automatically via its existing default parameter).**

Rationale:
1. `tests/narrative/cache.test.ts` (full file read, confirmed) proves the narrative cache's PRIMARY invalidation is `decision.t` changing — a new cycle always produces a new key (`${asset}:${t}`), independent of the old entry's remaining TTL. TTL is a secondary/backstop expiry, not the freshness mechanism. Raising it to 7-8h does not weaken correctness.
2. `openspec/specs/decision-narrative/spec.md`'s live "Cost-mitigation caching" requirement explicitly says the narrative cache is valid "within the same window the decision itself is cached (β...)" — decoupling into a second constant would, on a literal reading, require a MODIFIED spec delta for no correctness benefit currently motivating it.
3. The cache is also bounded by `MAX_ENTRIES = 16` with oldest-eviction (`src/narrative/cache.ts:32`), an independent, tighter practical bound than TTL in most real usage patterns.
4. Decoupling adds a second constant to keep synchronized with zero current driving requirement — YAGNI.

This is `sdd-design`'s decision to finalize; this exploration's recommendation is "keep coupled, zero code change in `narrative/cache.ts`."

## Recommended TTL value

**8h** (`BETA_MS = 8 * 60 * 60 * 1000` = `28_800_000`), i.e. 6h cadence + ~33% margin. Rationale:
- No evidence in this repo of confirmed n8n Cloud Starter scheduling jitter beyond the one user-confirmed live 6h run — but no guarantee of zero jitter either, and the cost of the TTL being slightly too short is a full recurrence of this exact bug, while the cost of it being slightly too long is only marginally staler displayed data (already accepted by the user's chosen scope). That asymmetry favors the larger margin.
- 7h (~17% margin) is a defensible tighter alternative if the user prefers less staleness exposure — flagging both since the user's own framing was "~7-8 hours" without picking one; proceeding with 8h as the recommendation within that authorized range.
- Clean round value preserves the existing constant's readability convention (`60 * 60 * 1000` style, not a raw literal).

## Spec-conflict check

- `openspec/specs/decision-dashboard/spec.md:62-76` "No-data UX (cache-miss empty state)" — pins only the no-data MESSAGE constraints, not any duration. **No conflict, no delta needed.**
- `openspec/specs/decision-narrative/spec.md:57-58` "Cost-mitigation caching" — ties narrative-cache TTL conceptually to "the same window... β". Since the recommendation keeps them coupled, **no conflict, no delta needed.**
- `openspec/specs/stream-windowing/spec.md:5-18` "Fixed sliding-window configuration (Cuadro 1)" — pins RANGE (ω) / STEP (β) per indicator; this β is a dimensionless candle-count (always `1`, wired into `WindowSpec.beta: 1` in `src/domain/types.ts:37`), NOT a time duration — structurally unrelated to `BETA_MS`. Repo-wide grep confirms `BETA_MS` is never imported by `src/laf/`, `src/stream/`, or `src/domain/`. **No conflict.** The shared naming is a documentation artifact worth a one-line cleanup note in `sdd-design`, not a blocker.
- No other live spec references "beta", TTL, or cache duration.

## Test-impact catalog

| File | What it does | Action needed |
|---|---|---|
| `tests/narrative/cache.test.ts` (full read) | Every assertion references `BETA_MS` relatively, never a literal | **No change** — scales automatically |
| `tests/api/decisions.test.ts:54-69` | Seeds via `seedCycleCache(buildReport(), 1)` — explicit TTL, decoupled | **No change** |
| `tests/helpers/seedCycleCache.ts:65-67` | Own default `ttlMs = 60_000`, independent of `BETA_MS` | **No change** |
| `tests/api/decisions.test.ts` (other cases), `tests/api/decisions-invariance.test.ts` | No `BETA_MS`/TTL references | **No change** |
| `tests/cycle/idempotency.test.ts` | No `BETA_MS`/TTL references (grep-confirmed) | **No change** |
| `tests/api/narrative.test.ts:151-177` | `NO_DECISION` cases seed via their own TTLs | **No change** |

Net: pure constant-value change with **zero required test edits**.

## `[MANUAL-VERIFICATION-ONLY]` gate

Recommend **yes**, same pattern as `n8n-cadence-6h`'s live-schedule gate. This bug was discovered only via live production observation, not a failing test — automated tests can prove the constant/expiry math changed, not that the dashboard stays populated across a real multi-hour production gap. `sdd-spec`/`sdd-design` should add a scenario requiring the user to confirm live that "Servicio momentáneamente no disponible" no longer appears during a normal 6h inter-run window before archive.

## Risks

- TTL value (7h vs 8h) is a judgment call with no hard jitter data — recommending 8h within the user's authorized "~7-8h" range.
- `BETA_MS`'s doc-comment ("beta (paper Cuadro 1)...") is misleading relative to the actual unrelated Cuadro 1 β — cosmetic only.
- No automated test can prove the production symptom is gone — covered by the recommended manual gate; do not mark PASS without it.
- Client-side `OverviewClient` sticky-`ready` behavior is pre-existing/unrelated, not touched by this change.

## Ready for Proposal

Yes. Small, well-scoped bugfix: 1 constant value change, zero required test edits, no spec conflicts, one design decision to finalize (keep-coupled) and one value to confirm (8h, within the user's authorized 7-8h range).
