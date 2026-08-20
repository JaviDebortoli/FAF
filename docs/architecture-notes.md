# Architecture notes

## Cron cadence vs. candle-close: why the 6h schedule doesn't need candle alignment (design.md D-B)

n8n's Schedule Trigger fires every 6 hours (reduced from a finer cadence to
cut execution volume and budget spend), while every indicator in this system
reads 1h candles (`beta=1` candle per Cuadro 1). This means each `/api/cycle`
invocation is now COARSER than the candle it reads, not finer as before — up
to ~6 new hourly candles can close between two consecutive runs.

This is safe by construction: `Fetch Klines` requests `limit=50` 1h candles
per cycle. Six new candles per 6h cycle is comfortably inside that window
(~44-candle safety margin), so every run's fetch always covers the full gap
since the previous run — no candle is ever missed because of the cadence.

Two ways to handle this were available:

1. **Align the cron cadence to candle-close** — trigger `/api/cycle` exactly
   when a new candle closes. Rejected: it couples n8n's scheduling to
   Binance's specific candle-close semantics (clock skew, exchange
   maintenance windows, multi-asset candles that don't necessarily close in
   lockstep), and it contradicts D2 (n8n stays "cron + fetch", no bespoke
   timing logic).
2. **Rely on the `limit=50` fetch window to absorb the gap** (the chosen
   approach) — the 6h cadence's ~44-candle margin over the ~6 candles
   produced per cycle means no gap-detection or alignment logic is needed.

As a secondary backstop, `runCycle` is also a pure function of its input
candles (see `src/cycle/runCycle.ts`): it reads no wall clock, and every
output timestamp is derived from the input candles themselves, never
`Date.now()`. So even if a cycle ever ran twice against the same candle set,
recomputing would be a correct, idempotent no-op
(`tests/cycle/idempotency.test.ts`) — not the primary reason the 6h cadence
is safe, but a guarantee that holds regardless.
