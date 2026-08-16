import { describe, expect, it } from 'vitest';
import { Store, DataFactory } from 'n3';
import { extractEvidence } from '@/src/stream/evidence';

// FAF paper §2.1/§3.3 — R2S operator: active conditions -> Evidence[] (0..8).
// Composes window.ts + indicators + confidence.ts + risk.ts. Hand-built N3
// fixtures mirror src/rdf's eventual output shape (no L1 dependency, same
// rationale as tests/stream/window.test.ts).

const { namedNode, literal, quad } = DataFactory;
const FAF_NS = 'http://faf.org/ontology#';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const PRICE_EVENT_TYPE = namedNode(FAF_NS + 'PriceEvent');
const HOUR = 3_600_000;

function addPriceEvent(store: Store, asset: string, t: number, close: number): void {
  const subject = namedNode(`${FAF_NS}event_${asset}_price_${t}`);
  store.addQuad(quad(subject, RDF_TYPE, PRICE_EVENT_TYPE));
  store.addQuad(quad(subject, namedNode(FAF_NS + 'asset'), namedNode(FAF_NS + asset)));
  store.addQuad(
    quad(
      subject,
      namedNode(FAF_NS + 'timestamp'),
      literal(new Date(t).toISOString(), namedNode(XSD_NS + 'dateTime')),
    ),
  );
  store.addQuad(
    quad(subject, namedNode(FAF_NS + 'close'), literal(String(close), namedNode(XSD_NS + 'decimal'))),
  );
}

describe('extractEvidence (R2S operator)', () => {
  it('emits no evidence at all on cold start (fewer candles than any indicator omega)', () => {
    const store = new Store();
    for (let i = 0; i < 5; i++) {
      addPriceEvent(store, 'BTCUSDT', i * HOUR, 100 + i);
    }

    const evidences = extractEvidence(store, 'BTCUSDT', 4 * HOUR);

    expect(evidences).toEqual([]);
  });

  it('emits rsi_bullish (deep oversold), sma_bearish (structural downtrend) and macd_bearish (D5) for a 60-candle accelerating decline', () => {
    // 60 candles: strictly decreasing, decrement -1/candle for i<30 then
    // -1.5/candle for i>=30 (accelerating downtrend, avoids the perfectly
    // LINEAR decline's MACD histogram converging to a floating-point-noise
    // "0" — see D5 below). Still strictly monotonic decreasing throughout,
    // so RSI's all-losses behavior is unaffected by the acceleration.
    const store = new Store();
    let price = 200;
    for (let i = 0; i < 60; i++) {
      addPriceEvent(store, 'BTCUSDT', i * HOUR, price);
      price -= i < 30 ? 1 : 1.5;
    }
    const now = 59 * HOUR;

    const evidences = extractEvidence(store, 'BTCUSDT', now);
    const predicates = evidences.map((e) => e.predicate).sort();

    // RSI (DEVIATION D6, see design.md / docs/PRD.md): omega widened from the
    //   paper's literal 14 to 20 (RSI's own defining period, 14, is now passed
    //   explicitly to computeRSI, so Wilder's continuation loop genuinely
    //   runs). All-losses in every sub-window -> RSI=0 regardless of period
    //   -> rsi_bullish (oversold reversal signal), unaffected by D6 here.
    // SMA: SMA20 (mean of the 20 most recent/lowest closes) < SMA50 (mean of all 50,
    //   including older/higher closes) in a monotonic decline -> sma_bearish
    // MACD (DEVIATION D5, see design.md / docs/PRD.md): omega widened from the
    //   paper's literal 26 to 50 so the EMA(26)/EMA(9) chain has enough history
    //   to converge to a non-degenerate, multi-point series. The recent-half
    //   acceleration in the decline gives a genuinely negative histogram (fast
    //   EMA falling away from slow EMA faster than the signal line can track)
    //   -> macd_bearish fires with real confidence (sigma_H > 0).
    // Bollinger: window is unaffected by D5 (still omega=20); last close sits
    //   within the +-2sigma bands of the trailing 20 closes -> neither
    //   bollinger_bullish nor bollinger_bearish fires.
    expect(predicates).toEqual(['macd_bearish', 'rsi_bullish', 'sma_bearish']);

    const rsiEvidence = evidences.find((e) => e.predicate === 'rsi_bullish')!;
    expect(rsiEvidence.label.gamma).toBeCloseTo(1, 9); // RSI=0 -> (30-0)/30=1
    expect(rsiEvidence.label.rho).toBeGreaterThanOrEqual(0);
    expect(rsiEvidence.label.rho).toBeLessThanOrEqual(1);
    expect(rsiEvidence.window).toEqual({ indicator: 'RSI', omega: 20, beta: 1 });
    expect(rsiEvidence.provenance.priceEventIris).toHaveLength(20);
    expect(rsiEvidence.provenance.indicatorEventIri).toContain('BTCUSDT');
    expect(rsiEvidence.provenance.rawValue).toBeCloseTo(0, 9);

    const smaEvidence = evidences.find((e) => e.predicate === 'sma_bearish')!;
    expect(smaEvidence.label.gamma).toBeGreaterThan(0);
    expect(smaEvidence.label.gamma).toBeLessThanOrEqual(1);
    expect(smaEvidence.provenance.priceEventIris).toHaveLength(50);

    const macdEvidence = evidences.find((e) => e.predicate === 'macd_bearish')!;
    expect(macdEvidence.window).toEqual({ indicator: 'MACD', omega: 50, beta: 1 });
    expect(macdEvidence.provenance.priceEventIris).toHaveLength(50);
    expect(macdEvidence.provenance.rawValue).toBeLessThan(0); // histogram < 0
    expect(macdEvidence.label.gamma).toBeGreaterThan(0);
    expect(macdEvidence.label.gamma).toBeLessThanOrEqual(1);
  });

  it('auto-retracts rsi_bullish (no explicit signal) once RSI returns to the neutral 30-70 range', () => {
    // Same 60-candle decline, then 14 alternating +1/-1 candles (roughly
    // balanced gains/losses) push RSI back toward ~50 (neutral).
    const store = new Store();
    for (let i = 0; i < 60; i++) {
      addPriceEvent(store, 'BTCUSDT', i * HOUR, 200 - i);
    }
    let last = 200 - 59; // 141
    for (let i = 60; i < 74; i++) {
      last += i % 2 === 0 ? 1 : -1;
      addPriceEvent(store, 'BTCUSDT', i * HOUR, last);
    }

    const beforePredicates = extractEvidence(store, 'BTCUSDT', 59 * HOUR).map((e) => e.predicate);
    const afterPredicates = extractEvidence(store, 'BTCUSDT', 73 * HOUR).map((e) => e.predicate);

    expect(beforePredicates).toContain('rsi_bullish');
    expect(afterPredicates.some((p) => p.startsWith('rsi_'))).toBe(false);
  });

  describe('DEVIATION D5 — MACD window widened from Cuadro-1 omega=26 to 50', () => {
    it('activates macd_bullish (histogram > 0, sigma_H > 0, real confidence) for a 50-candle accelerating rise', () => {
      // Mirrors the accelerating-decline fixture above but rising, and only
      // 50 candles (the minimum MACD now requires) so this test also proves
      // the fix in isolation from RSI/SMA/Bollinger's own activations.
      const store = new Store();
      let price = 100;
      for (let i = 0; i < 50; i++) {
        addPriceEvent(store, 'BTCUSDT', i * HOUR, price);
        price += i < 25 ? 1 : 1.5;
      }
      const now = 49 * HOUR;

      const evidences = extractEvidence(store, 'BTCUSDT', now);
      const macdEvidence = evidences.find((e) => e.predicate === 'macd_bullish');

      expect(macdEvidence).toBeDefined();
      expect(macdEvidence!.provenance.rawValue).toBeGreaterThan(0); // histogram > 0
      expect(macdEvidence!.provenance.sigmaOmega).toBeGreaterThanOrEqual(0);
      expect(macdEvidence!.label.gamma).toBeGreaterThan(0);
      expect(macdEvidence!.label.gamma).toBeLessThanOrEqual(1);
      expect(evidences.some((e) => e.predicate === 'macd_bearish')).toBe(false);

      // Before D5 (omega=26) this same fixture's window() call would already
      // have had sufficientHistory=true at 26 candles, but computeMACD would
      // degenerate to a single-point series (histogram/sigma_H always 0) —
      // the confidence formula's sigma_H===0 guard would force gamma=0 and
      // the indicator would never actually reach this activation branch with
      // a non-zero, meaningful histogram. This assertion is the fix's proof.
      expect(macdEvidence!.provenance.rawValue).not.toBe(0);
    });

    it('requires 50 candles for MACD specifically (sufficientHistory=false with only 26-49) even though the pre-D5 Cuadro-1 value (26) would have been "enough"', () => {
      const store = new Store();
      for (let i = 0; i < 40; i++) {
        addPriceEvent(store, 'BTCUSDT', i * HOUR, 100 + i);
      }

      // 40 candles: >= RSI's 14 and Bollinger's 20, but < MACD's (and SMA's) 50.
      const evidences = extractEvidence(store, 'BTCUSDT', 39 * HOUR);
      const predicates = evidences.map((e) => e.predicate);

      expect(predicates.some((p) => p.startsWith('macd_'))).toBe(false);
      expect(predicates.some((p) => p.startsWith('sma_'))).toBe(false);
    });
  });
});
