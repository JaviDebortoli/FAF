# Exploration: presentation-cache-persistence

## Current State

**Hypothesis CONFIRMED, not refuted.** The Vercel-multi-instance in-memory-cache-sharing failure is the real root cause of the recurring "Servicio no disponible" symptom.

**Deployment model (confirmed real serverless, Node.js, not Edge, no single-instance config exists):**
- `app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `app/api/decisions/[asset]/narrative/route.ts` all declare `export const runtime = 'nodejs'` (not `'edge'`), plus `dynamic = 'force-dynamic'` and `maxDuration = 60`.
- No `vercel.json` exists in the repo (confirmed via glob) — project runs on Vercel's zero-config defaults.
- `next.config.ts` is an empty `NextConfig = {}` — no relevant overrides.
- `package.json` has no persistence dependency at all: no `@vercel/kv`, `@vercel/postgres`, `@vercel/blob`, `upstash`, `redis`, or DB driver of any kind. Dependencies are just `@anthropic-ai/sdk`, `n3`, `next`, `react`/`react-dom`. `.env.example` has only `FAF_CYCLE_SHARED_SECRET` and `ANTHROPIC_API_KEY` — no KV/DB connection string.
- PRD (`docs/PRD.md`) only states "Deployment: Repositorio en GitHub sincronizado con Vercel" — no tier or scaling config specified, consistent with a thesis-scope/Hobby-tier assumption (not textually pinned).

**Cache implementation (confirmed no persistence anywhere in the path):**
- `src/cycle/latest.ts`: `const entries = new Map<Market, CacheEntry>()` at module scope. `put`/`get`/`getForAsset` are synchronous, pure in-memory Map operations. Its own doc comment (added during `acciones-market-integration`) already states the module-scope cache "is not reliably shared across Vercel function instances... where the routes commonly execute as separate function instances" and that this is exactly why the old recompute-on-miss design was retired.
- `app/api/cycle/route.ts` POST: `const report = runCycle(parsed.assets); cache.put(report.market, report, BETA_MS);` — writes only to that in-memory Map, nothing durable.
- `app/api/decisions/route.ts` GET: `const cached = cache.get(market); if (!cached) return 503 NO_DATA` — pure cache read, **no recompute fallback of any kind** (confirmed by reading the file: there is no `runCycle`/`pullAllAssets` call anywhere in this route). A cache miss is unconditionally `503 NO_DATA`.
- `src/narrative/cache.ts` has the identical pattern/caveat for the narrative route's LLM-response cache (separate concern, cost-mitigation only, not the dashboard's core "no data" bug, but same underlying per-instance-Map risk).

**TTL explicitly ruled out as the cause:**
- `BETA_MS` (`src/cycle/constants.ts`) is currently `5 * 24 * 60 * 60 * 1000` = **5 days**, set by `acciones-market-integration` today. This is far longer than "shortly after running n8n" — TTL expiry cannot explain the reported symptom.
- **Stronger evidence than just "TTL is long enough": this bug was already independently misdiagnosed as a TTL problem once before and the TTL fix did NOT work.** The archived change `openspec/changes/archive/2026-08-20-cycle-cache-ttl-6h/proposal.md` describes the *exact same user-reported symptom* ("Servicio momentáneamente no disponible" recovering only after manual n8n re-trigger) and "fixed" it by raising `BETA_MS` from 1h to 8h — while **explicitly scoping out** the Vercel multi-instance risk as merely a "secondary/probabilistic contributor... bigger architectural change, not requested" (see that file's "Out of Scope" section). That change was archived as complete. The user is now reporting the *same symptom again*, after two TTL increases (1h→8h→5days). This is strong direct evidence that TTL was never the (sole) root cause — the actual root cause (instance non-sharing) was identified at the time but deliberately deferred, and has now resurfaced exactly as flagged.

**Prior architecture decision that must be explicitly revisited, not silently overridden:**
- `openspec/changes/archive/2026-08-17-dynamic-asset-count/design.md` ("Supersession" section) records that the *old* design — `POST /api/cycle` accepting an empty body and `GET /api/decisions` recomputing via `pullAllAssets()` (a direct server-side Binance pull) on cache miss — was **intentionally removed**, precisely because of this same instance-sharing issue: "the module-scope cache is not reliably shared across Vercel function instances... the *recompute* path was the common production path, so most dashboard reads served independently-pulled Binance data rather than n8n's payload" — violating the user's explicit binding requirement that asset data must come from n8n's push, and no other source. This is directly relevant to Option B below: reviving any form of "GET falls back to fetching fresh data itself" reintroduces exactly the violation this prior change was created to eliminate, regardless of how it's scoped.
- `openspec/specs/semantic-ingestion/spec.md` "Requirement: Market-keyed presentation cache" only pins per-market cache isolation, not persistence — no existing spec requirement blocks adding a persistence layer.

**Vercel platform behavior research (current, confirms this is a real, not theoretical, risk):**
- Vercel's default execution model since **April 23, 2025** is "Fluid Compute" (enabled by default for all new projects) — a single physical instance CAN serve multiple concurrent invocations of the same function, which is actually a partial *mitigation* of the naive "every request = new instance" mental model. However, Fluid Compute does **not** guarantee single-instance-for-all-traffic: Vercel still scales out to multiple instances under load (a router picks whichever warm instance has the most available resources — round-robin-like distribution across possibly-several instances, not a single pinned instance), and idle instances are still recycled (traditional serverless: instances die after ~1-2 minutes idle; Fluid Compute instances persist longer under active use but are still ephemeral, not permanent). Vercel's docs confirm no built-in mechanism exists to pin/guarantee single-instance execution for a Next.js Node.js serverless deployment on Hobby or Pro tier — this remains fundamentally a multi-instance execution model.
- Conclusion: under real (even light) traffic, a `POST /api/cycle` write and a subsequent `GET /api/decisions` read landing on different instances is genuinely possible and becomes more likely the longer the gap between requests or the more concurrent traffic exists — consistent with "works right after n8n runs, breaks shortly after" being an *intermittent, instance-routing-dependent* symptom rather than deterministic on/off behavior.

## Affected Areas

- `src/cycle/latest.ts` — the cache abstraction itself; `put`/`get`/`getForAsset`/`clear` would need to become `async` under any persistence-backed option
- `app/api/cycle/route.ts` — POST handler, sole cache writer
- `app/api/decisions/route.ts` — GET handler, cache reader, would need `await cache.get(...)`
- `app/api/decisions/[asset]/narrative/route.ts` — reads via `cycleCache.getForAsset`, plus its own separate `src/narrative/cache.ts` has the identical caveat (secondary, cost-mitigation only)
- `tests/helpers/seedCycleCache.ts` — shared test-seeding seam, calls `cycleCache.put` synchronously; would need `await` if `put` becomes async
- `tests/cycle/latest.test.ts`, `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts`, `tests/api/narrative.test.ts`, `tests/cycle/idempotency.test.ts`, `tests/narrative/cache.test.ts` — 6 more test files touching the cache surface (7 total including the seed helper)
- `.env.example` — would gain a new persistence connection env var under Options A/C
- `package.json` — would gain a new dependency under Options A/C

## Approaches

1. **Option A — Add a real persistence layer (Upstash Redis via Vercel Marketplace, formerly "Vercel KV")** — `src/cycle/latest.ts`'s `put`/`get`/`getForAsset` become `async`, backed by Redis instead of an in-memory `Map`.
   - Research note: "Vercel KV" as a standalone product is **deprecated** — existing stores were auto-migrated to Upstash Redis in Dec 2024. The current path is provisioning "Upstash for Redis" from the Vercel Marketplace (first-class dashboard integration, auto-injects env vars, or `@upstash/redis` directly). Free tier (direct Upstash account): 256MB storage, 500K commands/month. Via Vercel Marketplace integration the free allotment is smaller (~30K commands/day cited by one source) — needs re-verification against Upstash's live pricing page at propose/design time since terms shift.
   - Pros: genuinely fixes the bug (durable, cross-instance-consistent store); Vercel-native, minimal account/billing friction (one dashboard click); realistic free-tier headroom for a low-traffic thesis-scope app (one push per 6h cadence, occasional dashboard reads); also fixes the identical latent risk in `src/narrative/cache.ts` if desired (though that one is lower-severity, cost-mitigation only).
   - Cons: touches every cache call site (both routes, narrative route, `seedCycleCache.ts`, 6+ test files) turning sync calls async; adds a new external dependency + env var + failure mode (network call, timeout, auth) that didn't exist before; needs a decision on whether tests should hit a real/mocked Redis or an in-memory fake behind the same async interface.
   - Effort: Medium.

2. **Option B — Restore a cache-miss recompute fallback, scoped to only trigger on empty cache** — GET pulls fresh candles from Binance server-side only when the push-only cache is empty.
   - **This directly reintroduces the exact problem `dynamic-asset-count`'s "Supersession" section explicitly retired the old design to fix**: any GET-side Binance pull — no matter how it's scoped ("only on miss" is precisely how the old design already worked, and that conditional is exactly what made it "the common production path" in practice, per the retirement rationale) — serves independently-pulled Binance data instead of n8n's payload, violating the user's binding "n8n is the only data source" requirement, which was the whole reason this fallback was removed. Reviving this as literally described would not just be a regression, it would recreate the *documented, user-confirmed* worse problem.
   - Pros: no new external dependency; smallest code diff of any option; would technically make the "Servicio no disponible" symptom disappear.
   - Cons: reintroduces the single-source-of-truth violation that was the primary motivation for the `dynamic-asset-count` change, requiring the user to explicitly re-authorize walking back a decision they already made with sign-off; masks (doesn't fix) the underlying multi-instance cache problem — `src/narrative/cache.ts` and any other cache reader would still silently return wrong/stale-instance data with no visible symptom at all, arguably worse than a visible 503.
   - Effort: Low, but flagged as **not recommended without explicit fresh user sign-off**, since it reverses a previously binding decision.

3. **Option C — Lighter-weight persistence primitive (Vercel Blob)** — write the cache report as a JSON blob per market, read it back on GET.
   - Research: Vercel Blob free tier (Hobby) is 1GB storage / 10GB transfer/month — generous for tiny JSON payloads. However, Blob is fundamentally a CDN-cache-backed object store, not a low-latency KV store: default reads go through a CDN cache where "overwrites and deletes take up to 60 seconds to propagate"; a `useCache: false` consistent-read mode exists for private blobs but adds per-request cost/complexity, and blob pathnames are content-addressed by default (need `allowOverwrite: true` to reuse a fixed key per market, which is an atypical/non-default usage pattern for the SDK).
   - Pros: generous free tier; avoids introducing a full Redis/KV client if the team wants to minimize new external services.
   - Cons: consistency model is a worse fit for this exact bug than Redis — a 60-second CDN propagation window (unless explicitly opting into slower/costlier consistent reads) reintroduces a smaller-scale version of the same "read doesn't see the latest write" problem this change exists to fix; SDK usage pattern (overwrite-by-fixed-key) is non-default and less battle-tested for this shape of workload than a KV store.
   - Effort: Medium (similar call-site surface to Option A, plus extra care around consistency mode selection).

4. **Option D — No code change, change deployment configuration to force single-instance execution** — configure Vercel to guarantee one instance handles all traffic, sidestepping the multi-instance problem entirely.
   - Research confirms: **no such configuration exists** for Vercel Hobby or Pro tier Next.js serverless/Fluid Compute functions — this is fundamentally a multi-instance execution model with no user-facing "pin to one instance" setting in `vercel.json` or the dashboard. The only way to get single-instance/persistent-process semantics on Vercel-adjacent infrastructure would be moving off Vercel Functions entirely (e.g. a long-running container on Railway/Fly.io/a VPS) — a full deployment-platform migration, not a configuration toggle, and a much larger change than this bug warrants for a thesis-scope project already invested in Vercel + GitHub sync per the PRD.
   - Pros: none realistic within "stay on Vercel."
   - Cons: doesn't exist as a viable option on the current platform without a full migration.
   - Effort: N/A on Vercel / Very High if reframed as "migrate off Vercel" — **not a real option for this project**, included only for completeness.

## Recommendation

No single option is picked with high confidence — this is a genuine architecture decision with real cost/complexity tradeoffs for a thesis-scope (unfunded) project, and the user should weigh in explicitly. That said, ranked by realistic viability given the research above:

- **Option A (Upstash Redis) is the most promising default** if the user is willing to accept one new external dependency and touch the cache call sites (async conversion) — it is the only option that both fixes the bug and preserves the existing push-only single-source-of-truth architecture, with free-tier headroom that comfortably fits this project's traffic pattern (one push per 6h, low read volume).
- **Option B should be explicitly declined or explicitly re-authorized by the user**, not silently chosen — it is the cheapest fix but directly reverses a signed-off architectural decision (`dynamic-asset-count`'s Supersession) for reasons that decision explicitly anticipated and rejected.
- **Option C is a viable fallback to A** only if the user wants to avoid adding a KV/Redis-shaped dependency, but its consistency model is a comparatively awkward fit for this exact bug.
- **Option D is not realistic** without a full platform migration, which is out of proportion to this bug.

## Risks

- Whichever persistence option is chosen, the async conversion of `src/cycle/latest.ts`'s `put`/`get`/`getForAsset` ripples into every current caller and at least 7 test files — this is a real, non-trivial, but well-bounded diff (all call sites are known and enumerated above).
- `src/narrative/cache.ts` has the identical per-instance-Map risk but is lower severity (cost-mitigation cache, not the user-visible "no data" bug) — the proposal should explicitly decide whether this change's scope includes fixing it too or defers it, to avoid silently leaving a known-identical bug pattern unaddressed right next to the one being fixed.
- Free-tier limits for whichever managed persistence service is chosen (Upstash commands/month, Vercel Blob storage/transfer) should be re-verified at design time against live current pricing pages, since these change over time and this exploration's figures are a snapshot.
- If the user picks Option B, this must be treated as reopening a previously-closed, explicitly-signed-off decision (`dynamic-asset-count` Supersession) rather than a fresh choice — needs explicit fresh sign-off, not silent reversal.

## Ready for Proposal

Yes — the root cause is confirmed with strong direct evidence (repeat symptom after two independent TTL increases, explicit prior architecture note deferring exactly this risk), TTL is explicitly ruled out, and four real options with researched tradeoffs are laid out. Options A/B/C should be presented to the user as the central decision (D is not viable), not picked unilaterally.
