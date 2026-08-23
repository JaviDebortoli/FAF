# Proposal: Persist the presentation cache across Vercel instances (Upstash Redis)

## Intent

Production intermittently shows "Servicio no disponible" shortly after a successful n8n push, forcing repeated manual n8n re-runs. Confirmed root cause (see `exploration.md`): `src/cycle/latest.ts` is an in-memory module-scope `Map`; Vercel's serverless/Fluid Compute model has no single-instance guarantee, so `POST /api/cycle` (writer) and `GET /api/decisions` (reader) can land on different instances that don't share memory. TTL was ruled out — this exact symptom already recurred after two independent TTL increases (`cycle-cache-ttl-6h`, `acciones-market-integration`), each of which explicitly deferred this same risk. This proposal replaces the in-memory cache with a real, cross-instance-shared store.

## Sign-Off Callout

- **(a) Push-only architecture is fully preserved.** Redis is a passive store behind the existing `put`/`get`/`getForAsset` surface — no new data source, no GET-side recompute. This does NOT reopen or reverse `dynamic-asset-count`'s Supersession decision.
- **(b) Both caches are in scope**, per explicit user decision: `src/cycle/latest.ts` (the user-visible bug) and `src/narrative/cache.ts` (identical per-instance-Map risk, LLM-cost mitigation), same Redis backend.
- **(c) Provisioning Upstash is a manual, external-account prerequisite**, not an implementation task — this proposal cannot create a Vercel Marketplace integration or Upstash account programmatically (same pattern as the Twelve Data API key in `acciones-market-integration`).

## Scope

### In Scope
- Convert `src/cycle/latest.ts` (`put`/`get`/`getForAsset`/`clear`) to async, backed by `@upstash/redis`
- Convert `src/narrative/cache.ts` to the same async/Redis pattern
- Update all call sites: `app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `app/api/decisions/[asset]/narrative/route.ts`, `tests/helpers/seedCycleCache.ts`
- Update the 6 affected test files to the async surface (real or fake Redis behind the same interface — decided at design time)
- Add Redis connection env var(s) to `.env.example`, add `@upstash/redis` to `package.json`

### Out of Scope
- GET-side recompute fallback (Option B — explicitly declined, would reverse `dynamic-asset-count`)
- Vercel Blob (Option C — declined, weaker consistency fit)
- Forcing single-instance Vercel execution (Option D — confirmed non-viable)
- Any change to `BETA_MS`/TTL values

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `semantic-ingestion`: "Market-keyed presentation cache" requirement gains a durability/cross-instance-consistency guarantee (Redis-backed instead of in-memory).
- `decision-narrative`: "Cost-mitigation caching" requirement gains the same durability guarantee.

## Approach

Introduce `@upstash/redis` as the backing store for both cache modules, preserving their existing public function signatures except for `async`/`Promise` returns. Cache keys stay market/asset-scoped as today; TTL enforcement moves to Redis native expiry (`EX`) instead of app-level timestamp comparison, unless design finds a reason to keep both. All current callers gain `await`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/cycle/latest.ts` | Modified | Sync Map → async Redis-backed cache |
| `src/narrative/cache.ts` | Modified | Same treatment, same backend |
| `app/api/cycle/route.ts` | Modified | `await cache.put(...)` |
| `app/api/decisions/route.ts` | Modified | `await cache.get(...)` |
| `app/api/decisions/[asset]/narrative/route.ts` | Modified | `await cycleCache.getForAsset(...)`, narrative cache reads/writes async |
| `tests/helpers/seedCycleCache.ts` | Modified | `await` seeding |
| 6 test files (cycle/decisions/narrative) | Modified | Async surface, Redis mock/fake strategy TBD at design |
| `.env.example` | Modified | New Redis connection var(s) |
| `package.json` | Modified | `@upstash/redis` dependency |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Async conversion ripples into 7+ call sites/tests, non-trivial diff | Med | Fully enumerated above; well-bounded, no hidden call sites found |
| New external dependency: network call, auth, timeout failure modes | Med | Design phase defines timeout/error handling; failure should degrade to today's 503, not worse |
| Upstash free-tier limits drift or are tighter via Marketplace vs. direct account | Low | Re-verify exact limits at `sdd-design` time against live pricing (see Dependencies) |
| Local tests can't prove real cross-instance behavior | High (inherent) | `[MANUAL-VERIFICATION-ONLY]` gate on live Vercel deployment (see Success Criteria) |

## Rollback Plan

Revert the Redis-backed modules to the prior in-memory `Map` implementation (git revert of this change's commits); no data migration needed since the cache is disposable/derived state, not a source of truth. Remove `@upstash/redis` and the env var. The bug returns but no data loss occurs.

## Dependencies

- **Manual prerequisite**: user must provision "Upstash for Redis" (via Vercel Marketplace or a direct Upstash account) and supply the resulting connection env var(s) before this change can run in production. This proposal cannot do this step.
- Upstash's exact current free-tier limits (commands/month, storage, Marketplace vs. direct-account allotment) must be re-verified against Upstash's live pricing page at `sdd-design` time — exploration's figures are a snapshot that can drift.

## Success Criteria

- [ ] `src/cycle/latest.ts` and `src/narrative/cache.ts` are Redis-backed and async; all call sites and tests pass
- [ ] No change to push-only ingestion behavior (verified against `semantic-ingestion`'s "Push-only asset ingestion" requirement)
- [ ] `[MANUAL-VERIFICATION-ONLY]`: user confirms, on the live Vercel deployment, that the dashboard reliably shows data across multiple page loads/instances after a single n8n push, without needing to re-run n8n — this is the actual proof the bug is fixed and cannot be established by local tests alone

## Proposal question round

These are open product/edge-case questions surfaced during proposal drafting. Core scope (Option A, both caches) is already confirmed — these refine edge-case behavior, not scope:

1. **Redis outage behavior**: if Redis is unreachable/times out on a GET, should the route still return 503 `NO_DATA` (same user-visible symptom as today, just a different cause), or something more diagnostic? Assumption: keep 503 to preserve current API contract unless told otherwise.
2. **TTL mechanism**: should TTL move to Redis-native expiry (`EX`), or stay as an app-level timestamp check against a Redis-stored value? Assumption: Redis-native, simpler and removes a class of app-code bugs — flagging in case there's a reason to keep app-level (e.g. wanting a still-inspectable payload after "logical" expiry).
3. **Test strategy**: should the 6 affected test files exercise a real Upstash test instance, or an in-memory fake implementing the same async interface? Assumption: in-memory fake, to keep CI fast and credential-free — flagging since this is a design-level call the user may want to weigh in on now rather than at `sdd-design`.

Reply to correct any assumption, or say "proceed" to accept them as-is and move to spec/design.
