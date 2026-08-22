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
 * `inicio-content-polish` — recolored to `var(--color-buy)` (box fill/stroke,
 * connectors, arrowheads, labels) via literal SVG props, the same proven
 * mechanism `ArgumentGraph.tsx` uses for `THESIS_COLOR`. This reuses the
 * platform's own established "active/current" green — the same treatment
 * `Sidebar.tsx` applies to its active-link state — so Inicio's hero diagram
 * reads as distinctly on-brand rather than a generic neutral illustration,
 * instead of the previous strictly zinc/monochrome palette that deliberately
 * avoided `--color-buy`/`--color-sell`. No unit test by design, mirroring
 * `icons.tsx` (static markup, coverage via e2e visibility assertion only).
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
        recomendación de Compra, Venta o Sin recomendación.
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
              stroke="var(--color-buy)"
              strokeWidth={1.5}
            />
            <polyline
              points={`${toX - 10},${NODE_Y - 8} ${toX},${NODE_Y} ${toX - 10},${NODE_Y + 8}`}
              fill="none"
              stroke="var(--color-buy)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
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
            fill="var(--color-buy)"
            fillOpacity={0.1}
            stroke="var(--color-buy)"
            strokeWidth={1.5}
          />
          <text
            x={node.x}
            y={NODE_Y + 4}
            textAnchor="middle"
            fill="var(--color-buy)"
            className="font-mono text-[13px]"
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
