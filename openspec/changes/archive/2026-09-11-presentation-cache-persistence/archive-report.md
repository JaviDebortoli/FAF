# Archive Report: Persist the presentation cache across Vercel instances (Upstash Redis)

**Archive Date**: 2026-09-11  
**Change Name**: presentation-cache-persistence  
**Artifact Store**: hybrid (openspec + engram)  
**Status**: ARCHIVED  

## Executive Summary

The presentation-cache-persistence change has been fully planned, implemented, verified, and archived. This change converted the in-memory module-scope cache in `src/cycle/latest.ts` and `src/narrative/cache.ts` from process-local `Map` storage to a Redis-backed async interface via `@upstash/redis`, enabling cross-instance cache visibility on Vercel's serverless platform.

A production root-cause defect was discovered and fixed in Phase F (2026-08-23): the Upstash SDK's default `automaticDeserialization: true` setting caused double-JSON-parse errors that were silently swallowed by the fail-open catch handler, producing deterministic 503 responses. The fix (passing `automaticDeserialization: false` to the Redis constructor) was validated with a permanent guard test in `tests/lib/redis.test.ts`.

All 32 implementation tasks across Phases A–F are complete and checked in `tasks.md`. The Phase E manual gate closure (2026-09-11) confirmed that production reliably shows data across multiple page loads and instances after a single n8n push, without requiring re-runs — the exact criterion that cannot be proven by local tests alone.

## Archive Contents

**Archived to**: `openspec/changes/archive/2026-09-11-presentation-cache-persistence/`

- [x] proposal.md
- [x] design.md
- [x] tasks.md (32/32 tasks complete)
- [x] apply-progress.md
- [x] verify-report.md
- [x] specs/semantic-ingestion/spec.md (delta)
- [x] specs/decision-narrative/spec.md (delta)

## Task Completion Validation

**Gate Status**: PASS  
All implementation tasks marked complete and verified:

| Phase | Tasks | Status | Evidence |
|-------|-------|--------|----------|
| A — Redis Client + Fake | 6 | ✓ Complete | A.1–A.6 all [x] in tasks.md |
| B — Cycle Cache Conversion | 3 | ✓ Complete | B.1–B.3 all [x] in tasks.md |
| C — Narrative Cache Conversion | 3 | ✓ Complete | C.1–C.3 all [x] in tasks.md |
| D — Route Wiring | 9 | ✓ Complete | D.1–D.9 all [x] in tasks.md |
| E — Manual Verification Gate | 7 | ✓ Complete | E.1–E.7 all [x]; E.7 user-confirmed 2026-09-11 |
| F — Remediation (Phase F) | 4 | ✓ Complete | F.1–F.4 all [x]; guard test added |
| **Total** | **32** | **✓ Complete** | **0 unchecked tasks** |

## Verification Status

**Verdict**: PASS (from verify-report.md, fresh independent re-run at HEAD 33f3a20)

| Metric | Result |
|--------|--------|
| Build (`npx tsc --noEmit`) | PASSED (0 errors) |
| Unit Tests (vitest) | 294/294 PASSED |
| E2E Tests (playwright) | 53/53 PASSED |
| Critical Findings | 0 |
| Warnings | 0 |
| Suggestions | 2 (no coverage tool, cross-instance monitoring consideration) |
| Requirements Compliant | 2/2 |
| Scenarios Compliant | 8/8 (6 automated + 2 manual-gate) |

## Spec Merge Results

### semantic-ingestion
**Status**: Delta merged into main spec via `gentle-ai sdd-archive-compose`

**MODIFIED requirement applied**: "Market-keyed presentation cache"

Added/Updated Scenarios:
- Acciones push does not affect crypto cache entry
- Crypto push does not affect acciones cache entry
- Write is visible to a read served by a different instance (manual-gate attestation)
- Redis unreachable on read yields existing no-data contract
- TTL enforced via store-native expiry

**Source**: `openspec/changes/presentation-cache-persistence/specs/semantic-ingestion/spec.md`  
**Destination**: `openspec/specs/semantic-ingestion/spec.md`

### decision-narrative
**Status**: Delta merged into main spec via `gentle-ai sdd-archive-compose`

**MODIFIED requirement applied**: "Cost-mitigation caching"

Added/Updated Scenarios:
- Repeated open reuses cached narrative
- New decision invalidates cache
- Cached narrative hit is visible across instances (manual-gate attestation)

**Source**: `openspec/changes/presentation-cache-persistence/specs/decision-narrative/spec.md`  
**Destination**: `openspec/specs/decision-narrative/spec.md`

## Final State at Close

The following is the definitive record of what shipped as of this archive (2026-09-11, 14:00 UTC):

### Code Changes (all committed, pushed to main)

| File | Status | Change | Commit |
|------|--------|--------|--------|
| `src/lib/redis.ts` | New | Lazy singleton Redis client, `automaticDeserialization: false` [Rem. F] | 33f3a20 + earlier |
| `src/cycle/latest.ts` | Modified | Async Redis-backed cache, keys `cycle:latest:{market}` | 33f3a20 + earlier |
| `src/narrative/cache.ts` | Modified | Async Redis-backed cache, keys `narrative:{asset}:{t}` | 33f3a20 + earlier |
| `app/api/cycle/route.ts` | Modified | `try/await cache.put()` + `502 CACHE_WRITE_FAILED` on error | 33f3a20 + earlier |
| `app/api/decisions/route.ts` | Modified | `await cache.get()` fail-open behavior | 33f3a20 + earlier |
| `app/api/decisions/[asset]/narrative/route.ts` | Modified | `await` all cache calls, fire-and-forget narrative put | 33f3a20 + earlier |
| `tests/helpers/fakeRedis.ts` | New | In-memory fake Redis client, configured for `automaticDeserialization: false` [Rem. F] | 33f3a20 + earlier |
| `tests/lib/redis.test.ts` | New [Rem. F] | Guard test pinning `automaticDeserialization: false` construction | 33f3a20 |
| `tests/cycle/latest.test.ts` | Rewritten | Fake Redis mock + fake timers, 11 scenarios | 33f3a20 + earlier |
| `tests/narrative/cache.test.ts` | Rewritten | Fake Redis mock + fake timers, 13 scenarios | 33f3a20 + earlier |
| `tests/helpers/seedCycleCache.ts` | Modified | Async `seedCycleCache`, `await cycleCache.put` | 33f3a20 + earlier |
| 5 integration test files | Modified | Async seeding + `await` all cache interactions | 33f3a20 + earlier |
| `package.json` | Modified | Added `@upstash/redis` dependency | 33f3a20 + earlier |
| `.env.example` | Modified | Added `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 33f3a20 + earlier |

**All code committed and pushed to main branch (HEAD: 33f3a20).**

### Production Deployment Requirements (Manual Prerequisites)

These manual steps must be completed on the live Vercel deployment for the fix to be operational:

- [x] Provision "Upstash for Redis" via Vercel Marketplace or a direct Upstash account (Confirmed 2026-09-11, per E.4)
- [x] Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel project environment variables (Confirmed 2026-09-11, per E.5)
- [x] Redeploy the project to Vercel (Confirmed 2026-09-11, per E.6)
- [x] Verify on live Vercel: dashboard reliably shows data across multiple page loads/instances after a single n8n push, without n8n re-runs (Confirmed 2026-09-11, per E.7)

### Remediation Phase F — Production Root-Cause Fix (2026-08-23 Incident)

**Incident**: First live production deployment test on 2026-08-23 resulted in deterministic `503 Servicio no Disponible` responses on both markets (acciones and crypto) while the n8n `POST /api/cycle` flow was fully green.

**Root Cause** (per design.md, orchestrator-verified against Upstash official documentation):
1. The `@upstash/redis` SDK defaults to `automaticDeserialization: true`
2. With this default, the SDK's `get()` method auto-parses any JSON-looking stored value and returns the PARSED object, not the raw string
3. `src/cycle/latest.ts`'s `get()` function then attempted `JSON.parse(raw)` where `raw` was already an object
4. This produced `JSON.parse("[object Object]")` → `SyntaxError`
5. The deliberate fail-open catch block (`catch { return null; }`) swallowed the error
6. Every read returned `null`, triggering the `503 NO_DATA` contract
7. Local tests passed because `tests/helpers/fakeRedis.ts` returns values verbatim (node-redis semantics) and never modeled the SDK's auto-deserialization behavior

**Fix Applied** (commit 33f3a20):
- Modified `src/lib/redis.ts` line 63 to pass `automaticDeserialization: false` to the Redis constructor
- Added permanent guard test `tests/lib/redis.test.ts` that spies on the constructor and asserts the exact option is passed
- Updated `tests/helpers/fakeRedis.ts` doc comment to record that it models the SDK as configured with `automaticDeserialization: false`

**Impact**: The fix ensures that production behavior exactly matches the verbatim-value semantics of the local test fake, preventing similar fidelity gaps. The guard test is the only test that exercises the real client construction (all other tests mock `src/lib/redis.ts` itself), making it a critical regression net.

### Manual Verification Gate Closure (Phase E, 2026-09-11)

The spec and design.md designated the only valid proof method for cross-instance cache behavior as a live-deployment manual attestation, because a single-process local test harness cannot prove that two independent serverless instances share Redis state.

**E.7 Verification** (exact criterion from tasks.md):  
User confirms that on the live Vercel deployment, the dashboard reliably shows data across multiple page loads/instances after a single n8n push, without needing to re-run n8n — this is the actual proof the production bug is fixed.

**Result**: User-confirmed 2026-09-11 by replying to a verbatim re-ask of E.7, explicitly confirming exactly this behavior across multiple instances.

**Closure**: The 2 previously-untested cross-instance scenarios are now compliant:
- `semantic-ingestion` / "Write is visible to a read served by a different instance" → COMPLIANT (manual-gate attestation)
- `decision-narrative` / "Cached narrative hit is visible across instances" → COMPLIANT (manual-gate attestation)

## Delivery Status

**Ready for deployment**: Yes
- Code changes fully implemented and tested
- All 32 tasks complete
- Full verification suite passing (294/294 vitest, 53/53 playwright, build clean)
- Specs merged into main OpenSpec
- Change archived

**Pending for production**: Manual prerequisite setup (Upstash provisioning, env vars, redeploy) — prerequisite is external infrastructure, not code work. Once the manual steps are completed, the deployment will activate the cross-instance cache and resolve the intermittent 503 bug that previously recurred after every n8n push.

## Artifact Paths

### OpenSpec
- **Archived Change Folder**: `openspec/changes/archive/2026-09-11-presentation-cache-persistence/`
- **Updated Main Specs**:
  - `openspec/specs/semantic-ingestion/spec.md` (merged)
  - `openspec/specs/decision-narrative/spec.md` (merged)
- **This Report**: `openspec/changes/archive/2026-09-11-presentation-cache-persistence/archive-report.md`

### Engram (Persistent Memory)
- **Topic Key**: `sdd/presentation-cache-persistence/archive-report`
- **Type**: architecture
- **Observation IDs** (source artifacts for traceability):
  - proposal: archived in openspec (hybrid mode, not engram-native)
  - spec: archived in openspec (hybrid mode, not engram-native)
  - design: archived in openspec (hybrid mode, not engram-native)
  - tasks: archived in openspec (hybrid mode, not engram-native)
  - verify-report: archived in openspec (hybrid mode, not engram-native)
  - archive-report: persisted to engram topic key (this document)

**Note**: In hybrid mode, the primary artifacts were persisted in OpenSpec (openspec/changes/{change}/), and the archive report is the first artifact dual-persisted to both OpenSpec (filesystem) and Engram (persistent memory).

## Risks and Mitigations

| Risk | Status | Mitigation |
|------|--------|-----------|
| Cross-instance behavior cannot be proven locally | CLOSED | Live-deployment manual verification gate (E.7) executed and confirmed 2026-09-11 |
| Async conversion ripple across 7+ call sites | MITIGATED | Fully enumerated in proposal.md and systematically tested; no hidden call sites |
| SDK auto-deserialization fidelity gap | FIXED | Guard test added; production now matches test fake exactly |
| Upstash free-tier limits drift | ACKNOWLEDGED | Design phase will re-verify against live Upstash pricing before each deployment; current deployment within verified limits |

## Key Learnings

1. SDK default behavior (auto-deserialization) mismatch with test fake semantics is invisible to local test suites and caused a production outage; permanent guard test on client construction is the regression net.

2. Cross-instance correctness for serverless platforms cannot be asserted by local single-process test harnesses; manual live-deployment verification is the spec-designated, only valid proof method.

3. Fail-open error handling (cache miss on read failure) is correct for genuine network failures but silently masks construction/configuration defects; pairing it with a construction-validation test is essential.

4. Chained PR delivery across async-module conversions and their callers introduces a transient-breakage window; close sequencing on CI/CD pipelines mitigates the risk and is precedented in this repo's `acciones-market-integration` change.

---

**Archive Closed**: 2026-09-11  
**Ready for**: Next SDD change or production deployment (manual prerequisites already confirmed completed)
