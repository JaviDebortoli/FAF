import type { Evidence, EvidencePredicate, Label, RuleId, Thesis } from '@/src/domain/types';
import { RULES } from '@/src/laf/rules';

/**
 * design.md "SVG Argumentation Graph": the topology is fixed and known
 * statically from RULES — layout is a pure function of the rule table plus
 * the fired evidence set, with no layout engine at runtime. Fixed viewBox +
 * preserveAspectRatio (applied by the component), so there is no JS
 * measurement and no hydration mismatch.
 */
export const GRAPH_VIEWBOX = '0 0 720 380';

/** Fixed vertical spacing between consecutive leaf rows (column 0). */
export const ROW_H = 42;
const LEAF_Y0 = 22;

const LEAF_X = 60;
const AGGREGATE_X = 300;
const CONFLICT_X = 480;
const NET_X = 660;

export type NodeId = RuleId | 'AP' | 'AN' | 'CA' | 'NP' | 'NN';
export type LeafState = 'fired' | 'inactive';

export interface LeafNode {
  kind: 'leaf';
  id: RuleId;
  predicate: EvidencePredicate;
  thesis: Thesis;
  x: number;
  y: number;
  state: LeafState;
  /**
   * design.md's fired/non-fired table: fired leaves show <gamma,rho> "from
   * the evidence"; a non-fired leaf has no framework label at all, so this
   * is `null` — NEVER an invented <0,0>.
   */
  label: Label | null;
}

export interface AggregateNode {
  kind: 'aggregate';
  id: 'AP' | 'AN';
  thesis: Thesis;
  x: number;
  y: number;
}

export interface ConflictNode {
  kind: 'conflict';
  id: 'CA';
  x: number;
  y: number;
}

export interface NetNode {
  kind: 'net';
  id: 'NP' | 'NN';
  thesis: Thesis;
  x: number;
  y: number;
}

export type GraphNode = LeafNode | AggregateNode | ConflictNode | NetNode;

export interface GraphEdge {
  from: NodeId;
  to: NodeId;
}

export interface ArgumentGraphLayout {
  viewBox: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function leafY(i: number): number {
  return LEAF_Y0 + i * ROW_H;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Column 0 — all 8 leaves at `y = LEAF_Y0 + i*ROW_H`, iteration order taken
 * directly from RULES, so the diagram cannot drift from L3's own rule table.
 * Fired/non-fired is derived purely by set difference against `evidences`
 * (RULES predicate present in `evidences` -> fired) — the topology itself
 * never changes, only which leaves are highlighted.
 */
export function layoutArgumentGraph(evidences: Evidence[]): ArgumentGraphLayout {
  const evidenceByPredicate = new Map(evidences.map((e) => [e.predicate, e]));

  const leaves: LeafNode[] = RULES.map((rule, i) => {
    const evidence = evidenceByPredicate.get(rule.predicate);
    return {
      kind: 'leaf',
      id: rule.id,
      predicate: rule.predicate,
      thesis: rule.thesis,
      x: LEAF_X,
      y: leafY(i),
      state: evidence ? 'fired' : 'inactive',
      label: evidence ? evidence.label : null,
    };
  });

  const bullishLeaves = leaves.filter((l) => l.thesis === 'bullish');
  const bearishLeaves = leaves.filter((l) => l.thesis === 'bearish');

  // Column 1 — AP at the centroid of R1-R4, AN at the centroid of R5-R8.
  const ap: AggregateNode = {
    kind: 'aggregate',
    id: 'AP',
    thesis: 'bullish',
    x: AGGREGATE_X,
    y: average(bullishLeaves.map((l) => l.y)),
  };
  const an: AggregateNode = {
    kind: 'aggregate',
    id: 'AN',
    thesis: 'bearish',
    x: AGGREGATE_X,
    y: average(bearishLeaves.map((l) => l.y)),
  };

  // Column 2 — CA centered between AP and AN.
  const ca: ConflictNode = { kind: 'conflict', id: 'CA', x: CONFLICT_X, y: average([ap.y, an.y]) };

  // Column 3 — the two net-label outputs, aligned with their own thesis row.
  const np: NetNode = { kind: 'net', id: 'NP', thesis: 'bullish', x: NET_X, y: ap.y };
  const nn: NetNode = { kind: 'net', id: 'NN', thesis: 'bearish', x: NET_X, y: an.y };

  const edges: GraphEdge[] = [
    ...bullishLeaves.map((l): GraphEdge => ({ from: l.id, to: 'AP' })),
    ...bearishLeaves.map((l): GraphEdge => ({ from: l.id, to: 'AN' })),
    { from: 'AP', to: 'CA' },
    { from: 'AN', to: 'CA' },
    { from: 'CA', to: 'NP' },
    { from: 'CA', to: 'NN' },
  ];

  return {
    viewBox: GRAPH_VIEWBOX,
    nodes: [...leaves, ap, an, ca, np, nn],
    edges,
  };
}
