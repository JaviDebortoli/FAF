import { describe, expect, it } from 'vitest';
import { GRAPH_VIEWBOX, ROW_H, layoutArgumentGraph } from '@/app/(dashboard)/lib/graphLayout';
import { RULES } from '@/src/laf/rules';
import type { Evidence } from '@/src/domain/types';

// design.md "SVG Argumentation Graph": the topology is a static property of
// RULES, never of the evaluated cycle, so all 8 leaves render at fixed
// positions regardless of which evidences fired this cycle. Fired/non-fired
// is derived purely by set difference against the `evidences` argument — the
// framework has no label for a non-fired predicate, so a non-fired leaf must
// never carry an invented <gamma,rho> (design.md's fired/non-fired table).

function evidenceFor(predicate: Evidence['predicate'], label: Evidence['label'] = { gamma: 0.6, rho: 0.2 }): Evidence {
  return {
    predicate,
    label,
    t: 1_700_000_000_000,
    asset: 'BTCUSDT',
    window: { indicator: 'RSI', omega: 20, beta: 1 },
    provenance: {
      indicatorEventIri: 'faf:event_test',
      priceEventIris: [],
      rawValue: 0,
      sigmaOmega: 0,
    },
  };
}

describe('layoutArgumentGraph', () => {
  it('uses a fixed viewBox regardless of the evidence set', () => {
    expect(layoutArgumentGraph([]).viewBox).toBe(GRAPH_VIEWBOX);
    expect(layoutArgumentGraph([evidenceFor('rsi_bullish')]).viewBox).toBe(GRAPH_VIEWBOX);
    expect(GRAPH_VIEWBOX).toBe('0 0 720 380');
  });

  it('renders all 8 RULES leaves, in RULES order, even with zero evidences', () => {
    const { nodes } = layoutArgumentGraph([]);
    const leaves = nodes.filter((n) => n.kind === 'leaf');
    expect(leaves).toHaveLength(8);
    expect(leaves.map((n) => n.id)).toEqual(RULES.map((r) => r.id));
    expect(leaves.map((n) => n.predicate)).toEqual(RULES.map((r) => r.predicate));
  });

  it('places every leaf at a fixed y offset spaced exactly ROW_H apart, in RULES order, independent of the fired set', () => {
    const empty = layoutArgumentGraph([]).nodes.filter((n) => n.kind === 'leaf');
    const withSome = layoutArgumentGraph([evidenceFor('rsi_bullish'), evidenceFor('bollinger_bearish')]).nodes.filter(
      (n) => n.kind === 'leaf',
    );

    // y coordinates are identical whether anything fired or not.
    expect(withSome.map((n) => n.y)).toEqual(empty.map((n) => n.y));

    // spacing between consecutive rows is exactly ROW_H.
    for (let i = 1; i < empty.length; i++) {
      expect(empty[i]!.y - empty[i - 1]!.y).toBeCloseTo(ROW_H, 9);
    }
    // y = y0 + i * ROW_H, i.e. every row is a fixed linear function of its RULES index.
    const y0 = empty[0]!.y;
    empty.forEach((leaf, i) => {
      expect(leaf.y).toBeCloseTo(y0 + i * ROW_H, 9);
    });
  });

  it('AP centroid sits at the average y of R1-R4, AN at the average y of R5-R8, sharing one column', () => {
    const { nodes } = layoutArgumentGraph([]);
    const leaves = nodes.filter((n) => n.kind === 'leaf');
    const ap = nodes.find((n) => n.id === 'AP');
    const an = nodes.find((n) => n.id === 'AN');
    expect(ap).toBeDefined();
    expect(an).toBeDefined();

    const bullishYs = leaves.slice(0, 4).map((n) => n.y);
    const bearishYs = leaves.slice(4, 8).map((n) => n.y);

    expect(ap!.y).toBeCloseTo(bullishYs.reduce((a, b) => a + b, 0) / 4, 9);
    expect(an!.y).toBeCloseTo(bearishYs.reduce((a, b) => a + b, 0) / 4, 9);
    expect(ap!.x).toBe(an!.x); // same column (x=1 per design.md's mermaid diagram)
    expect(ap!.x).not.toBe(leaves[0]!.x); // distinct from the leaf column
  });

  it('partitions leaves into fired vs. non-fired by set difference against the evidences argument', () => {
    const rsiLabel: Evidence['label'] = { gamma: 0.6, rho: 0.1 };
    const smaLabel: Evidence['label'] = { gamma: 0.3, rho: 0.4 };
    const evidences = [evidenceFor('rsi_bullish', rsiLabel), evidenceFor('sma_bearish', smaLabel)];

    const { nodes } = layoutArgumentGraph(evidences);
    const leaves = nodes.filter((n) => n.kind === 'leaf');

    const fired = leaves.filter((n) => n.state === 'fired');
    const inactive = leaves.filter((n) => n.state === 'inactive');
    expect(fired.map((n) => n.id).sort()).toEqual(['R1', 'R7']); // rsi_bullish=R1, sma_bearish=R7
    expect(inactive).toHaveLength(6);

    const r1 = leaves.find((n) => n.id === 'R1');
    const r7 = leaves.find((n) => n.id === 'R7');
    expect(r1!.label).toEqual(rsiLabel);
    expect(r7!.label).toEqual(smaLabel);
  });

  it('never invents <0,0> for a non-fired leaf — label is null, not a zero label', () => {
    const { nodes } = layoutArgumentGraph([]);
    const leaves = nodes.filter((n) => n.kind === 'leaf');
    for (const leaf of leaves) {
      expect(leaf.state).toBe('inactive');
      expect(leaf.label).toBeNull();
      expect(leaf.label).not.toEqual({ gamma: 0, rho: 0 });
    }
  });

  it('produces edges connecting each leaf to its thesis aggregate, both aggregates to CA, and CA to both net nodes', () => {
    const { edges } = layoutArgumentGraph([]);
    const bullishEdges = edges.filter((e) => e.to === 'AP');
    const bearishEdges = edges.filter((e) => e.to === 'AN');
    expect(bullishEdges.map((e) => e.from).sort()).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(bearishEdges.map((e) => e.from).sort()).toEqual(['R5', 'R6', 'R7', 'R8']);
    expect(edges).toContainEqual({ from: 'AP', to: 'CA' });
    expect(edges).toContainEqual({ from: 'AN', to: 'CA' });
    expect(edges).toContainEqual({ from: 'CA', to: 'NP' });
    expect(edges).toContainEqual({ from: 'CA', to: 'NN' });
  });
});
