import type { Store } from 'n3';
import type { Millis, WindowSpec } from '@/src/domain/types';
import { RDF_TYPE, TERMS, assetNode } from '@/src/rdf/ontology';

/**
 * REFACTOR (task 4.2): this module originally redeclared its own local
 * ontology constants because window.ts (Phase 3) is built before
 * src/rdf/ontology.ts (Phase 4) exists, per tasks.md's mandated
 * L3 -> L4 -> L2 -> L1 build order. window.ts's OWN tests still hand-build
 * N3.Store fixtures directly (no L1 mapping/store dependency) — only the
 * shared vocabulary constants are now imported from the canonical source,
 * removing the duplication (Boy Scout Rule).
 */
const PRICE_EVENT_TYPE = TERMS.PriceEvent;
const CLOSE = TERMS.close;
const TIMESTAMP = TERMS.timestamp;

export interface WindowContent {
  /** Chronologically ordered closes; length === spec.omega when sufficient history is available. */
  closes: number[];
  timestamps: Millis[];
  sufficientHistory: boolean;
}

/**
 * S2R operator (RSP-QL, design.md D-A): extracts the temporally bounded
 * window W(S, omega, beta) of faf:PriceEvent quads for `asset`, as of
 * `now`, from the RDF quad stream `store`. Returns the last `spec.omega`
 * candles' close prices in chronological order.
 *
 * Cold start (fewer than omega candles available) -> empty content with
 * sufficientHistory=false; no evidence is emitted downstream and no
 * neutral/default label is fabricated (stream-windowing spec).
 *
 * beta=1 (paper Cuadro 1): the window re-evaluates every candle step. This
 * function is itself stateless — beta is realized by the CALLER
 * re-invoking it once per new candle (zero persisted state, no window
 * state carried between calls). The §5 "edge effect" (the window's content
 * shifts by exactly one candle per beta step, so a condition detected near
 * the window boundary can only be confirmed on the NEXT evaluation) is
 * observed and documented here, not corrected — see the sliding-behavior
 * test in tests/stream/window.test.ts.
 */
export function window(store: Store, asset: string, now: Millis, spec: WindowSpec): WindowContent {
  const subjectAssetNode = assetNode(asset);
  const priceEventSubjects = store
    .getQuads(null, RDF_TYPE, PRICE_EVENT_TYPE, null)
    .map((q) => q.subject)
    .filter((subject) => store.getQuads(subject, TERMS.asset, subjectAssetNode, null).length > 0);

  const events = priceEventSubjects
    .map((subject) => {
      const tsQuad = store.getQuads(subject, TIMESTAMP, null, null)[0];
      const closeQuad = store.getQuads(subject, CLOSE, null, null)[0];
      if (!tsQuad || !closeQuad) return null;

      const t = Date.parse(tsQuad.object.value);
      const close = Number(closeQuad.object.value);
      if (!Number.isFinite(t) || !Number.isFinite(close)) return null;

      return { t, close };
    })
    .filter((event): event is { t: number; close: number } => event !== null && event.t <= now)
    .sort((a, b) => a.t - b.t);

  if (events.length < spec.omega) {
    return { closes: [], timestamps: [], sufficientHistory: false };
  }

  const windowEvents = events.slice(-spec.omega);
  return {
    closes: windowEvents.map((e) => e.close),
    timestamps: windowEvents.map((e) => e.t),
    sufficientHistory: true,
  };
}
