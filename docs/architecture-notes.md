# Architecture notes

## Cron cadence vs. candle-close: why recompute idempotency, not cadence alignment (design.md D-B)

n8n's Schedule Trigger polls every 1-5 minutes (design.md's n8n workflow),
while every indicator in this system reads 1h candles (`beta=1` candle per
Cuadro 1). This means the overwhelming majority of `/api/cycle` invocations
land WHILE the current hourly candle is still open (in progress) — the
candle set n8n fetches and pushes has not changed since the previous tick,
several minutes earlier.

Two ways to handle this were available:

1. **Align the cron cadence to candle-close** — only trigger `/api/cycle`
   once per hour, exactly when a new candle closes. Rejected: it couples
   n8n's scheduling to Binance's specific candle-close semantics (clock
   skew, exchange maintenance windows, and multi-asset candles that don't
   necessarily close in perfect lockstep all become failure modes), and it
   contradicts D2 (n8n stays "cron + fetch", no bespoke timing logic).
2. **Make recompute against an unchanged/in-progress candle a correct,
   idempotent no-op** (the chosen approach) — `runCycle` is a pure function
   of its input candles (see `src/cycle/runCycle.ts`): it reads no wall
   clock, and every timestamp in its output (`Decision.t`, `DecisionReport
   .computedAt`, `DecisionReport.cycleId`) is derived from the input candles
   themselves, never from `Date.now()`. Recomputing with byte-identical
   input candles therefore ALWAYS returns a byte-identical
   `DecisionReport` (`tests/cycle/idempotency.test.ts`).

This is exactly what design.md's D-B decision already establishes for the
`GET /api/decisions` cache path ("a cache miss recomputes an IDENTICAL
report, never a different one — correctness never depends on it"). The
1-5min-cron-vs-1h-candle mismatch is the same property applied to the
`POST /api/cycle` write path: repeated cycles against an in-progress candle
are expected, safe, and cheap (compute is O(50) per indicator, microseconds
— design.md's Deployment rationale), not a bug to be engineered around with
cadence alignment.
