'use client';

import { useEffect, useRef, useState } from 'react';
import type { DecisionReport } from '@/src/domain/types';
import { type Direction, selectActionable } from '../lib/select';
import { DecisionCard } from './DecisionCard';
import { DirectionFilter } from './DirectionFilter';
import { EmptyState } from './EmptyState';

/** UI polling cadence — distinct from `BETA_MS` (the backend cache TTL in
 * `src/cycle/constants.ts`); polling faster than the cache refreshes simply
 * re-serves the cached report, which is cheap and keeps the "changed since
 * last poll" state responsive without adding load. */
const POLL_INTERVAL_MS = 30_000;

/**
 * design.md "Component Architecture" — the sole client island for Tier 1:
 * owns the `GET /api/decisions` fetch/poll, the direction filter, the
 * selected-asset state (Phase 5 wires this to `DrilldownPanel`; this phase
 * only needs `DecisionCard` to be clickable), and session-only "changed
 * since last poll" diff state (by `decision.t` per asset — never persisted).
 */
export function OverviewClient() {
  const [report, setReport] = useState<DecisionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [changedAssets, setChangedAssets] = useState<Set<string>>(new Set());
  const lastTimestamps = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch('/api/decisions');
        if (!response.ok) {
          throw new Error(`GET /api/decisions failed with status ${response.status}`);
        }
        const data = (await response.json()) as DecisionReport;
        if (cancelled) return;

        const changed = new Set<string>();
        for (const decision of data.decisions) {
          const previousT = lastTimestamps.current.get(decision.asset);
          if (previousT !== undefined && previousT !== decision.t) {
            changed.add(decision.asset);
          }
          lastTimestamps.current.set(decision.asset, decision.t);
        }

        setReport(data);
        setChangedAssets(changed);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error loading decisions');
        }
      }
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="rounded-md border border-sell/40 bg-sell/10 px-4 py-3 text-sm text-sell">
        {error}
      </p>
    );
  }

  if (!report) {
    return <p className="font-mono text-sm text-muted">Cargando ciclo…</p>;
  }

  const allActionable = selectActionable(report, 'ALL');
  const visible = selectActionable(report, direction);

  return (
    <div className="flex flex-col gap-4">
      <DirectionFilter value={direction} onChange={setDirection} />

      {visible.length === 0 ? (
        allActionable.length === 0 ? (
          <EmptyState variant="no-active" />
        ) : (
          <EmptyState variant="filtered" direction={direction === 'BUY' ? 'BUY' : 'SELL'} />
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((decision) => (
            <div
              key={decision.asset}
              data-changed={changedAssets.has(decision.asset)}
              data-selected={decision.asset === selectedAsset}
              className={changedAssets.has(decision.asset) ? 'rounded-md ring-1 ring-threshold/50' : undefined}
            >
              <DecisionCard decision={decision} onSelect={setSelectedAsset} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
