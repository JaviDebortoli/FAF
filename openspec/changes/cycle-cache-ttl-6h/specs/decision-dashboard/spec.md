# Delta for decision-dashboard

## ADDED Requirements

### Requirement: Presentation-cache TTL survives the n8n inter-run gap

The presentation-cache TTL (`BETA_MS`, `src/cycle/latest.ts`'s `put`/`get` expiry) MUST remain longer
than n8n's configured inter-run interval, so that the "No-data UX (cache-miss empty state)" requirement
above is triggered only by a genuine absence of pushed data (first deploy before n8n's first cycle,
cache eviction, or a missed/delayed n8n run) — never by routine cache expiry between two consecutive
on-schedule runs.

#### Scenario: [MANUAL-VERIFICATION-ONLY] No spurious no-data state during a normal inter-run window

- GIVEN n8n is running unattended on its live, configured schedule (6h cadence) in production
- WHEN a user loads the dashboard at any point between two consecutive successful `POST /api/cycle`
  calls, including near the end of the inter-run window
- THEN the dashboard MUST NOT show the no-data/service-unavailable message ("Servicio momentáneamente
  no disponible") solely due to presentation-cache TTL expiry
- (Not automatable — no live multi-hour n8n execution/scheduling harness exists in this repo. If this
  scenario is not explicitly confirmed by the user in live production before archive, `sdd-verify`/
  `sdd-archive` MUST NOT mark this change PASS, per this project's manual-verification-gate norm.)
