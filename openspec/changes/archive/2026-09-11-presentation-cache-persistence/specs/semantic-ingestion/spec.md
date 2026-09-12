# Delta for semantic-ingestion

## MODIFIED Requirements

### Requirement: Market-keyed presentation cache

`src/cycle/latest.ts` MUST maintain one cache entry per `market` value in a durable, cross-instance-shared store (Redis-backed via `@upstash/redis`) rather than a single global entry or process-local in-memory state. A `POST /api/cycle` push for one market MUST update only that market's cache entry and MUST NOT overwrite, clear, or otherwise affect any other market's cached entry. A write for a given market MUST be visible to any subsequent read for that same market regardless of which serverless function instance serves either request. Entry expiry MUST be enforced via the store's native TTL mechanism (Redis `EX`) rather than app-level timestamp comparison.
(Previously: cache entries lived in a process-local in-memory `Map` with no durability or cross-instance-consistency guarantee, and TTL was enforced via app-level timestamp comparison.)

#### Scenario: Acciones push does not affect the crypto cache entry
- GIVEN a cached crypto report exists
- WHEN a `POST /api/cycle` push for `market: 'acciones'` is processed
- THEN the crypto cache entry MUST remain unchanged
- AND a new acciones cache entry MUST exist, independently expiring per its own TTL

#### Scenario: Crypto push does not affect the acciones cache entry
- GIVEN a cached acciones report exists
- WHEN a `POST /api/cycle` push for `market: 'crypto'` is processed
- THEN the acciones cache entry MUST remain unchanged

#### Scenario: Write is visible to a read served by a different instance
- GIVEN a `POST /api/cycle` push for `market: 'crypto'` completes successfully
- WHEN a `GET /api/decisions?market=crypto` request is served by a different serverless function instance than the one that handled the push
- THEN the read MUST return the pushed report
- AND correctness MUST NOT depend on the read and write landing on the same instance

#### Scenario: Redis unreachable on read yields the existing no-data contract
- GIVEN the Redis store is unreachable or times out during a cache read
- WHEN `GET /api/decisions` is called for any market
- THEN the response MUST be `503 NO_DATA`, the same contract as an ordinary cache miss
- AND MUST NOT surface a distinct or more diagnostic error state

#### Scenario: TTL enforced via store-native expiry
- GIVEN a cache entry was written more than `BETA_MS` ago
- WHEN a read for that market is attempted after the TTL window has elapsed
- THEN the store's native expiry MUST have already evicted the entry
- AND the read MUST report no cached data, identical to a cache miss
