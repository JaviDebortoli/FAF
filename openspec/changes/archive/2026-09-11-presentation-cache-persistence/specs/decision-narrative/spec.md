# Delta for decision-narrative

## MODIFIED Requirements

### Requirement: Cost-mitigation caching
The system MUST cache a generated narrative per `(asset, t)` for the current decision in a durable, cross-instance-shared store (Redis-backed via `@upstash/redis`, mirroring `src/cycle/latest.ts`'s cache backend), valid within the same window the decision itself is cached (β). Entry expiry MUST be enforced via the store's native TTL mechanism (Redis `EX`) rather than app-level timestamp comparison. A cache write MUST be visible to a subsequent read for the same `(asset, t)` regardless of which serverless function instance serves either request, so repeated drill-down opens for the same decision instance MUST NOT re-invoke the Claude API even when the write and the read land on different instances.
(Previously: cached in a process-local in-memory store with no durability or cross-instance-consistency guarantee, TTL enforced via app-level timestamp comparison.)

#### Scenario: Repeated open reuses cached narrative
- GIVEN a narrative was already generated for BTCUSDT's decision at time t within the current β window
- WHEN the drill-down for BTCUSDT is opened again before the decision changes
- THEN the cached narrative MUST be served without a new Claude API call

#### Scenario: New decision invalidates cache
- GIVEN a new cycle produces a decision with a different `t` for BTCUSDT
- WHEN the drill-down opens
- THEN the endpoint MUST generate a fresh narrative rather than serving the stale cached one

#### Scenario: Cached narrative hit is visible across instances
- GIVEN a narrative was generated for BTCUSDT's decision at time t, handled by one serverless function instance
- WHEN a subsequent drill-down request for BTCUSDT within the same β window is served by a different instance
- THEN the cached narrative MUST be served
- AND the Claude API MUST NOT be re-invoked
