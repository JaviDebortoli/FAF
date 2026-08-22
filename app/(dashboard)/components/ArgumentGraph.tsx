import type { Decision, Thesis } from '@/src/domain/types';
import { computeScores } from '../lib/scores';
import { layoutArgumentGraph } from '../lib/graphLayout';

interface ArgumentGraphProps {
  decision: Decision;
}

const THESIS_COLOR: Record<Thesis, string> = {
  bullish: 'var(--color-buy)',
  bearish: 'var(--color-sell)',
};

/**
 * design.md "SVG Argumentation Graph": the second signature element of the
 * dashboard (after Tier 1's ScoreGauge). Renders the FIXED 8/2/1 topology
 * from `lib/graphLayout.ts` — a thin mapper, no geometry computed here.
 * Fired leaves (present in `decision.trace.evidences`) render solid,
 * thesis-colored; non-fired leaves render dashed/muted with an accessible
 * "no activada en este ciclo" label carried by `<title>` (never just color).
 * Tier-2-only per D7 — this component is imported exclusively by
 * `DrilldownPanel`, never by any Tier 1 component.
 */
export function ArgumentGraph({ decision }: ArgumentGraphProps) {
  const layout = layoutArgumentGraph(decision.trace.evidences);
  const { sigmaPlus, sigmaMinus } = computeScores(decision);
  const sigmaByThesis: Record<Thesis, number> = { bullish: sigmaPlus, bearish: sigmaMinus };
  // no-recommendation-filter-and-i18n D2: derive from scores directly, never
  // from the recommendation label — mathematically equivalent to the old
  // `recommendation === 'BUY'` ternary for BUY/SELL (policy.ts's threshold
  // logic already implies this), and correct for NO_RECOMMENDATION, which
  // the old ternary silently defaulted to bearish.
  const winningThesis: Thesis = sigmaPlus >= sigmaMinus ? 'bullish' : 'bearish';
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const titleId = `graph-title-${decision.asset}`;
  const descId = `graph-desc-${decision.asset}`;

  return (
    <svg
      role="img"
      viewBox={layout.viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="h-auto w-full shrink-0 text-zinc-700"
    >
      <title id={titleId}>{`Grafo de argumentacion para ${decision.asset}`}</title>
      <desc id={descId}>
        {`Topologia fija de 8 reglas (R1-R8) agregadas en dos grupos, alcista y bajista, que convergen en un nodo de resolucion de conflicto. Recomendacion actual: ${decision.recommendation}.`}
      </desc>

      {layout.edges.map((edge) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return null;
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className="stroke-zinc-200"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}

      {layout.nodes.map((node) => {
        if (node.kind === 'leaf') {
          const fired = node.state === 'fired';
          const color = THESIS_COLOR[node.thesis];
          return (
            <g key={node.id} data-testid={`graph-node-${node.id}`} data-state={node.state}>
              <circle
                cx={node.x}
                cy={node.y}
                r={9}
                fill={fired ? color : 'none'}
                stroke={fired ? color : 'var(--color-inactive)'}
                strokeWidth={fired ? 0 : 1.5}
                strokeDasharray={fired ? undefined : '3 2'}
              />
              <title>
                {fired && node.label
                  ? `${node.id} (${node.predicate}): activada, gamma=${node.label.gamma.toFixed(2)}, rho=${node.label.rho.toFixed(2)}`
                  : `${node.id} (${node.predicate}): no activada en este ciclo`}
              </title>
              <text
                x={node.x + 15}
                y={node.y + 3}
                className="font-mono text-[9px] tabular-nums"
                fill={fired ? color : 'var(--color-muted)'}
              >
                {node.id}
              </text>
              {!fired && (
                <text x={node.x + 15} y={node.y + 13} className="font-sans text-[7px]" fill="var(--color-muted)">
                  no activada en este ciclo
                </text>
              )}
            </g>
          );
        }

        if (node.kind === 'aggregate') {
          const color = THESIS_COLOR[node.thesis];
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={13} fill="none" stroke={color} strokeWidth={1.5} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fill={color} className="font-mono text-[11px]">
                {'⊕'}
              </text>
            </g>
          );
        }

        if (node.kind === 'conflict') {
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={15} fill="none" stroke="currentColor" strokeWidth={1.5} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fill="currentColor" className="font-mono text-[12px]">
                {'⊖'}
              </text>
            </g>
          );
        }

        // net node
        const color = THESIS_COLOR[node.thesis];
        const sigma = sigmaByThesis[node.thesis];
        const isWinner = node.thesis === winningThesis;
        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={13}
              fill={isWinner ? color : 'none'}
              stroke={color}
              strokeWidth={isWinner ? 0 : 1.5}
            />
            <text
              x={node.x}
              y={node.y - 20}
              textAnchor="middle"
              className="font-mono text-[9px] tabular-nums"
              fill={isWinner ? color : 'var(--color-muted)'}
            >
              {`σ ${sigma.toFixed(2)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
