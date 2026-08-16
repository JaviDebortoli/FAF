# `paper-example` fixture — derivation (task 6.1, re-derived for Deviation D6)

`candles.json` holds 50 synthetic 1h `Candle`s for a single asset (`BTCUSDT`),
engineered so that running them through the REAL pipeline
(`mapCandles` -> `window`/`extractEvidence` -> `evaluateGraph` -> `decide`,
i.e. `runCycle`) reproduces the paper's §3 controlled example — the same
final numbers already proven algebra-only in `tests/golden/algebra-only.test.ts`
(Golden #2): `lambda*(mu+)=<0.50,0.00>`, `sigma+=0.75`, `sigma-=0.475`,
`gap=0.275` -> **BUY**, tolerance `1e-9`. This file (Golden #1,
`tests/golden/paper-example.test.ts`) is the end-to-end proof that real
OHLCV data, pushed through every layer's real formulas, lands on the exact
same decision — not just the L3/L4 algebra in isolation.

## Necessary deviation from the paper's literal e2/e3 rho values (MACD/SMA, from D5)

The paper's own §3 example uses evidence labels
`e1=rsi_bullish<0.50,0.40>`, `e2=macd_bullish<0.80,0.10>`,
`e3=sma_bearish<0.15,0.30>` — three DIFFERENT rho (risk) values. Reproducing
the MACD and SMA rho values (`0.10`/`0.30`) exactly through the real pipeline
is **not possible** after Deviation D5 (see `design.md` and `docs/PRD.md`):
D5 widened `MACD_SPEC.omega` from 26 to 50, making it IDENTICAL to
`SMA_SPEC.omega=50`. Both indicators now read from the exact same 50-candle
window (`src/stream/window.ts#window` always returns the last `omega`
candles, and with omega equal for both specs, both calls return the literal
same close array). `computeSigmaOmega(closes)` is a pure function of that
window's closes; identical input therefore ALWAYS produces identical
`sigma_omega`, and hence identical `rho = computeRisk(sigma_omega)`, for
MACD and SMA. Targeting `rho_macd=0.10` and `rho_sma=0.30` simultaneously is
therefore architecturally unsatisfiable post-D5, independent of anything
RSI-related.

`design.md`'s Deviation D5 addendum proves that a single shared value
`rho_shared=0.50` for both the MACD and SMA evidence reproduces the paper's
exact final decision numbers, even though the individual e2/e3 rho values
differ from the paper's literal 0.10/0.30 split. This fixture reuses that
exact `rho_shared=0.50` target (equation 4 below) — it is unaffected by D6.

## Deviation D6 — RSI now genuinely Wilder-smoothed over its own independent window

Deviation D6 (see `design.md`'s "Deviation D6" section and `docs/PRD.md`)
widens `RSI_SPEC.omega` from Cuadro 1's literal 14 to **20**, and makes the
call site pass RSI's own period (`14`) EXPLICITLY to `computeRSI`, so
Wilder's continuation-smoothing loop genuinely executes (`diffs.length=19 >
period=14`, 5 real recursive steps) instead of silently collapsing to a
single seed average. 20 (not 50, matching MACD_SPEC/SMA_SPEC) was chosen
deliberately: sharing MACD/SMA's 50-candle window would make RSI's `rho`
identical to theirs too (the same rho-collision problem D5's addendum
already documents for MACD/SMA), forcing `ominus`'s rho component to
`max(0, R-R)=0` whenever RSI/MACD-side evidence conflicts with SMA-side
evidence, for ANY value of R — a structural deadening of the risk dimension
of the paper's conflict operator (⊖), not just a fixture artifact. 20 keeps
RSI's window numerically distinct from MACD/SMA's shared 50-candle window
while still giving `computeRSI` enough closes for genuine continuation
smoothing.

**Key finding — the paper's ORIGINAL numbers are fully reproducible.**
Because RSI's window (indices 30-49 of the 50-candle series, see below) is
now genuinely independent in *identity* from MACD/SMA's shared window
(`sigma_omega` computed over RSI's own last-20-candle slice, not the full
50), RSI's own `rho` is free to hit the paper's literal `e1` target
(`sigma_omega=0.008 -> rho=0.40`) SIMULTANEOUSLY with MACD/SMA's shared
`rho_shared=0.50` (D5's addendum value) and RSI's own `gamma=0.50`. All 5
target equations below were solved simultaneously to residuals ~`1e-14`, so
**no golden-test assertion needed to change for D6** — `sigma-=0.475` and
`gap=0.275` (the paper's exact original numbers) hold unmodified. This is
a genuine improvement over D5's addendum, which DID force `sigma-`/`gap`
off the paper's literal values; D6 fixes a real correctness bug (real
Wilder smoothing) while fully preserving the paper's own worked example —
this was checked FIRST, before assuming any golden-test deviation would be
needed, per the task's instructions.

(An earlier, unmerged and never-committed attempt tried widening RSI's
window to 50, mirroring D5 exactly. That attempt was rejected for the
rho-collision reason above — see `design.md`'s Deviation D6 section — before
this 20-candle re-derivation was produced. No trace of the 50-candle
attempt remains in this fixture or its derivation.)

## Candle construction (how `candles.json` was actually built)

`candles.json` is one asset (BTCUSDT), 50 candles, timestamps 1h apart
starting at `openTime=1_700_000_000_000` (same base epoch used by other
fixtures in this repo, e.g. `tests/golden/algebra-only.test.ts`). Only
`close` drives every indicator in this codebase (`computeRSI`, `computeMACD`,
`computeSMA`, `computeBollingerBands`, `computeSigmaOmega` all operate on
`closes: number[]` only) — OHLC/volume have no bearing on any assertion, so
`open = previous close`, `high = max(open, close)`, `low = min(open, close)`,
`volume = 1000` (a constant placeholder) for every candle.

The 50 closes are built in **two segments, split at the RSI window
boundary** (a different split than the pre-D6 fixture, since RSI's own
window is now 20 candles, not 14):

1. **Segment A — indices 0-29 (30 candles)**: drives `SMA_SPEC`/`MACD_SPEC`
   (both still read the full 50-candle window) but is entirely EXCLUDED from
   `RSI_SPEC`'s own last-20-candle window. Same shape as the pre-D6 fixture's
   pre-window segment: an initial FLAT run at `100` for a fixed fraction
   `s=0.55` of the segment (a converged EMA fed an unchanged value is an
   exact fixed point, keeping EMA12/EMA26 anchored), followed by a power-law
   decline `price(t) = 100 + (Bstart-100)*t^p` for the remaining fraction,
   `t` normalized to `[0,1]` over that portion, ending exactly at `Bstart`
   (index 29).
2. **Segment B — indices 30-49 (20 candles = RSI's OWN window,
   `RSI_SPEC.omega=20`)**: starts at an independent price `Rstart` (index
   30; connects to segment A with a plain, unconstrained diff — the two
   segments need not meet smoothly, since that boundary diff only feeds the
   full-50-window equations, never RSI's own window), then **18 consecutive
   down-candles** of size `Dn` each, then **1 sharp up-candle** of size `U`
   (the most recent candle, index 49) — the same "many down, one up at the
   end" shape as the pre-D6 fixture's RSI segment, just stretched from
   13 diffs (14 candles) to 19 diffs (20 candles) to match the wider window
   and genuinely exercise Wilder's continuation loop.

Because `computeRSI`'s seed step (`period=14`) and continuation step
(5 more iterations, `i=14..18`) are each a FIXED LINEAR functional of the
`gains`/`losses` arrays (the recursive weights depend only on `period`, not
on the diff values themselves), scaling every down-diff by `Dn` and the
lone up-diff by `U` keeps `avgGain/avgLoss` — and therefore the final
RSI value — **independent of the absolute scale of `Dn`/`U`**, only their
*ratio* matters for RSI. This is the same scale-invariance trick the pre-D6
fixture used for the simple-average case, generalized to genuine Wilder
recursion: it lets the solver treat `Dn`/`U`'s ratio (which fixes RSI) and
their absolute scale (which, combined with `Rstart`, fixes RSI's own
`sigma_omega`) as separable-but-coupled unknowns, both handled together by
the numeric solve below.

## Solving for the 5 free parameters

Five unknowns — `Bstart` (segment A's ending price), `p` (curvature of
segment A's decline), `Rstart` (segment B's starting price), `Dn` (segment
B's down-candle magnitude), `U` (segment B's up-candle magnitude) — were
solved against five target equations using a numeric Levenberg-Marquardt
least-squares solver (finite-difference Jacobian, damped normal equations)
implemented against the REAL repo functions
(`computeRSI`, `computeMACD`, `computeSMA`, `computeSigmaOmega`,
`confidenceSmaBearish`, imported directly from `src/stream/*`, not
reimplemented or approximated). The flat fraction `s=0.55` (segment A) was
held fixed to keep the system exactly determined (5 unknowns, 5 equations).

| # | Target equation | Target value |
|---|---|---|
| 1 | `confidenceSmaBearish(SMA20, SMA50)` (over the full 50-candle window) | `0.15` |
| 2 | `computeRSI(segment B closes, 14)` — genuine Wilder RSI over RSI's OWN 20-candle window | `15` (=> `gamma=0.50`) |
| 3 | `computeMACD(closes).histogram / computeMACD(closes).sigmaH` (over the full 50-candle window) | `0.80` |
| 4 | `computeSigmaOmega(full 50-candle closes)` (shared MACD/SMA sigma_omega, per D5's addendum) | `0.01` (=> `rho_shared=0.50`) |
| 5 | `computeSigmaOmega(segment B closes)` — RSI's OWN sigma_omega, over its independent 20-candle window | `0.008` (=> `rho=0.40`, the paper's literal `e1` value) |

The solver converged to residuals on the order of `1e-14` (well inside the
golden test's `1e-9` tolerance), confirming all 5 targets — including RSI's
own `rho=0.40` — are simultaneously achievable now that RSI's window is
genuinely independent of MACD/SMA's:

```
Bstart = 77.84229791254002
p      = 0.6439388285031873
Rstart = 79.34893241706108
Dn     = 0.7379541245650761
U      = 1.692953579884584
```

## Verification (recomputed directly from `candles.json`)

| Quantity | Value | Target |
|---|---|---|
| RSI (segment B, own 20-window, genuine Wilder period=14) | `14.999999999999972` | `15` (=> gamma=0.50) |
| sigma_omega (RSI's own 20-window) | `0.008000000000000035` | `0.008` (=> rho=0.40) |
| MACD histogram/sigmaH ratio (full 50-window) | `0.8000000000000141` | `0.80` (=> gamma=0.80) |
| sigma_omega (shared 50-window, MACD & SMA) | `0.010000000000000004` | `0.01` (=> rho_shared=0.50) |
| SMA20 (= mean of segment B) | `72.45991361891531` | — |
| SMA50 (= mean of all 50 closes) | `85.24695719872393` | SMA50 > SMA20 (bearish cross) |
| confidenceSmaBearish(SMA20,SMA50) | `0.1500000000000004` | `0.15` (=> gamma=0.15) |
| Bollinger band (last-20-window, same slice as RSI's since `BOLLINGER_SPEC.omega=20` too) | last close (`67.76`) strictly inside `[lower, upper]` | no bollinger evidence fires, matching the paper's 3-evidence example |

Resulting evidence set (via `extractEvidence`, matching the paper's e1/e2/e3
**exactly**, including rho):

- `rsi_bullish<0.50, 0.40>` — matches the paper's literal `e1` exactly
- `macd_bullish<0.80, 0.50>` (rho differs from the paper's literal `0.10` —
  D5's addendum, unrelated to and unaffected by D6)
- `sma_bearish<0.15, 0.50>` (rho differs from the paper's literal `0.30` —
  D5's addendum, unrelated to and unaffected by D6)

Final decision (via `evaluateGraph` + `decide`), asserted by
`tests/golden/paper-example.test.ts` at `1e-9` tolerance — **byte-identical
to the paper's own original numbers, unchanged from before D6**:

- `lambda(mu+) = mean(<0.50,0.40>, <0.80,0.50>) = <0.65, 0.45>`
- `lambda(mu-) = <0.15, 0.50>`
- `lambda*(mu+) = ominus(<0.65,0.45>, <0.15,0.50>) = <0.50, 0.00>`
- `lambda*(mu-) = ominus(<0.15,0.50>, <0.65,0.45>) = <0.00, 0.05>`
- `sigma+ = 0.75`, `sigma- = 0.475`, `gap = 0.275` -> **BUY**

No bollinger evidence is emitted (price stays inside the bands), matching
the paper's example, which only uses e1/e2/e3.

## Solver implementation note

The throwaway Levenberg-Marquardt solver script (`tests/_d6_solve.test.ts`,
a temporary Vitest test importing the real repo functions via the `@/`
alias so it could run under `npx vitest run` without any extra tooling) was
deleted after use and is **not committed** — this file documents its method
and results in full, per the task's requirement that the derivation be
reproducible from this README alone.
