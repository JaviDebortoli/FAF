'use client';

import { useEffect, useRef } from 'react';
import type { Decision } from '@/src/domain/types';
import { ArgumentGraph } from './ArgumentGraph';
import { ThesisScores } from './ThesisScores';
import { NarrativePanel } from './NarrativePanel';

interface DrilldownPanelProps {
  decision: Decision;
  onClose: () => void;
}

/**
 * design.md "Component Architecture" / "Data Flow — narrative request": the
 * Tier 2 dialog for one asset's current decision. Graph and scores render
 * IMMEDIATELY from the already-fetched `Decision` — `OverviewClient` already
 * holds it from its Tier 1 poll, so no extra fetch happens for those. Only
 * `NarrativePanel` does its own lazy fetch, and it is mounted here
 * unconditionally on open: "lazy" per design.md means "not prefetched before
 * the drill-down opens", not "requires a second click after opening".
 *
 * No panel-open transition is applied (instant reveal) — matches the
 * restrained instrument-panel language and trivially respects
 * `prefers-reduced-motion` since there is no motion to reduce.
 *
 * Tier-2-only per D7 — this is the only place `ArgumentGraph`/`NarrativePanel`
 * are ever mounted; `OverviewClient` renders this panel only when an asset
 * is selected, never as part of the Tier 1 card grid.
 */
export function DrilldownPanel({ decision, onClose }: DrilldownPanelProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drilldown-title"
        data-testid={`drilldown-panel-${decision.asset}`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="drilldown-title" className="font-mono text-base font-semibold tracking-tight text-zinc-100">
            {decision.asset}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-md border border-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 motion-reduce:transition-none"
          >
            Cerrar
          </button>
        </div>

        <ArgumentGraph decision={decision} />
        <ThesisScores decision={decision} />
        <NarrativePanel asset={decision.asset} />
      </div>
    </div>
  );
}
