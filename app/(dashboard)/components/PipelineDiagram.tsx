interface PipelineNode {
  id: string;
  label: string;
  /** Center x-coordinate within the 960x200 viewBox. */
  x: number;
}

const NODES: PipelineNode[] = [
  { id: 'datos', label: 'Datos', x: 120 },
  { id: 'indicadores', label: 'Indicadores', x: 360 },
  { id: 'reglas', label: 'Reglas', x: 600 },
  { id: 'recomendacion', label: 'Recomendación', x: 840 },
];

const NODE_Y = 100;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 64;
const NODE_RX = 8;

/**
 * `inicio-visual-and-scroll-fix` — static 4-node SVG pipeline diagram
 * illustrating FAF's deterministic Datos -> Indicadores -> Reglas ->
 * Recomendación flow, matching the same 4-step order described in the info
 * card's prose on `app/dashboard/inicio/page.tsx`. Mirrors `icons.tsx`'s
 * hand-drawn, hardcoded SVG pattern (flat constants, no separate layout
 * module) rather than `lib/graphLayout.ts` + `ArgumentGraph.tsx`'s
 * dynamic-layout split: this diagram has a fixed topology with zero
 * runtime-dependent state, so a pure-function layout module would be
 * indirection without benefit (see exploration.md "Point 1 — diagram
 * construction", Approach 1).
 *
 * Strictly zinc/monochrome (`stroke-zinc-700` box borders, `fill-zinc-900/50`
 * box fill, `fill-zinc-300` labels, `stroke-zinc-600` connectors) —
 * deliberately avoids `--color-buy`/`--color-sell` since this illustrates a
 * generic deterministic process, not a directional BUY/SELL signal. No unit
 * test by design, mirroring `icons.tsx` (static markup, coverage via e2e
 * visibility assertion only).
 */
export function PipelineDiagram() {
  return (
    <svg
      role="img"
      viewBox="0 0 960 200"
      aria-labelledby="pipeline-diagram-title"
      aria-describedby="pipeline-diagram-desc"
      data-testid="inicio-pipeline-diagram"
      className="h-auto w-full"
    >
      <title id="pipeline-diagram-title">Pipeline determinístico de 4 capas de FAF</title>
      <desc id="pipeline-diagram-desc">
        Diagrama del flujo Datos → Indicadores → Reglas → Recomendación: ingesta de datos de mercado,
        cálculo de indicadores técnicos, evaluación de reglas argumentativas y agregación en una
        recomendación BUY/SELL.
      </desc>

      {NODES.slice(0, -1).map((node, i) => {
        // `noUncheckedIndexedAccess` (tsconfig.json) types `NODES[i + 1]` as
        // possibly `undefined` even though `slice(0, -1)` statically
        // guarantees a next node exists — same defensive-guard convention
        // as `CryptoDashboardPage`'s `MARKETS.crypto` guard.
        const next = NODES[i + 1];
        if (!next) return null;

        const fromX = node.x + NODE_WIDTH / 2;
        const toX = next.x - NODE_WIDTH / 2;
        return (
          <g key={`edge-${node.id}-${next.id}`}>
            <line
              x1={fromX}
              y1={NODE_Y}
              x2={toX}
              y2={NODE_Y}
              className="stroke-zinc-600"
              strokeWidth={1.5}
              opacity={0.85}
            />
            <polyline
              points={`${toX - 10},${NODE_Y - 8} ${toX},${NODE_Y} ${toX - 10},${NODE_Y + 8}`}
              fill="none"
              className="stroke-zinc-600"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          </g>
        );
      })}

      {NODES.map((node) => (
        <g key={node.id} data-testid={`inicio-pipeline-node-${node.id}`}>
          <rect
            x={node.x - NODE_WIDTH / 2}
            y={NODE_Y - NODE_HEIGHT / 2}
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            rx={NODE_RX}
            className="fill-zinc-900/50 stroke-zinc-700"
            strokeWidth={1.5}
          />
          <text x={node.x} y={NODE_Y + 4} textAnchor="middle" className="fill-zinc-300 font-mono text-[13px]">
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
