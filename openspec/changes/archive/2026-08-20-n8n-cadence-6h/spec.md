# Delta for semantic-ingestion — n8n Cadence 6h

## MODIFIED Requirements

### Requirement: n8n scheduler-only role (D2)

n8n MUST act only as a Schedule Trigger (6h) that performs a raw HTTP fetch and POSTs unmodified data to the ingestion route. n8n MUST NOT perform RDF-ification, per PRD deviation D2 and openspec/config.yaml `rules.proposal` (RDF modeling stays under Strict TDD in TypeScript). At this cadence, `Fetch Klines`'s configured `limit=50` (1h candles) covers each 6h gap with an ~44-candle safety margin (~6 new candles land per cycle) — this is the primary reason the cadence is safe; `runCycle`'s idempotency (a pure function of its input candles, so repeated calls are no-ops) is a secondary backstop, not the primary safeguard.

(Previously: pinned a "1-5 min" cadence, with safety framed as cadence being intentionally finer than the 1h candle so idempotency absorbed the overlap — that framing assumed a sub-5-minute interval and is now inverted at 6h.)

#### Scenario: n8n forwards raw data

- GIVEN the Schedule Trigger fires
- WHEN n8n calls the market-data source
- THEN n8n MUST POST raw OHLCV JSON to the Next.js ingestion route
- AND MUST NOT construct any RDF triples

#### Scenario: Schedule Trigger is configured for exactly 6h

- GIVEN `n8n/faf-workflow.json`'s Schedule Trigger node
- WHEN inspecting `parameters.rule.interval`
- THEN it MUST be `{"field": "hours", "hoursInterval": 6}`, not a minute-based interval

#### Scenario: limit=50 fetch window covers the 6h gap

- GIVEN `Fetch Klines` is configured with `interval: "1h"` and `limit: "50"`
- WHEN a cycle runs every 6h
- THEN the ~6 new 1h candles produced since the prior cycle MUST fall within the 50-candle fetch window, leaving an ~44-candle safety margin

#### Scenario: [MANUAL-VERIFICATION-ONLY] Live 6h schedule fires correctly in production

- GIVEN the imported workflow is active in the user's live n8n instance
- WHEN production runs unattended across at least one full 6h interval
- THEN the Schedule Trigger MUST fire on the configured 6h cadence and complete a cycle
- (Not automatable — no live n8n execution/scheduling harness exists in this repo. If this scenario is not explicitly confirmed by the user before archive, `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS, per this project's manual-verification-gate norm.)
