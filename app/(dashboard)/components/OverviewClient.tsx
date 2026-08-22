'use client';

import { useEffect, useRef, useState } from 'react';
import type { DecisionReport } from '@/src/domain/types';
import { type Direction, selectByDirection } from '../lib/select';
import { DecisionCard } from './DecisionCard';
import { DirectionFilter } from './DirectionFilter';
import { DrilldownPanel } from './DrilldownPanel';
import { EmptyState } from './EmptyState';
import { ServiceUnavailable } from './ServiceUnavailable';

/** UI polling cadence — distinct from `BETA_MS` (the backend cache TTL in
 * `src/cycle/constants.ts`); polling faster than the cache refreshes simply
 * re-serves the cached report, which is cheap and keeps the "changed since
 * last poll" state responsive without adding load. */
const POLL_INTERVAL_MS = 30_000;

/**
 * `dynamic-asset-count` design.md "`OverviewClient` view state machine" —
 * replaces the old `report`/`error` pair. `unavailable` means "never had a
 * successful `ready` state" — a failed refresh AFTER a successful load keeps
 * the last `ready` report instead of blanking the dashboard on a transient
 * blip (recovery is bounded by the existing `POLL_INTERVAL_MS`).
 */
type ViewState =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: 'no-data' | 'error' }
  | { kind: 'ready'; report: DecisionReport };

/**
 * design.md "Component Architecture" — the sole client island for Tier 1:
 * owns the `GET /api/decisions` fetch/poll, the direction filter, the
 * selected-asset state (wired to `DrilldownPanel` below — clicking a
 * `DecisionCard` opens it for that asset), and session-only "changed since
 * last poll" diff state (by `decision.t` per asset — never persisted).
 * `DrilldownPanel` (and, transitively, `ArgumentGraph`/`NarrativePanel`) is
 * mounted ONLY when `selectedDecision` is non-null — never as part of the
 * Tier 1 card grid itself (D7 clause 1).
 */
export function OverviewClient() {
  const [viewState, setViewState] = useState<ViewState>({ kind: 'loading' });
  const [direction, setDirection] = useState<Direction>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [changedAssets, setChangedAssets] = useState<Set<string>>(new Set());
  const lastTimestamps = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;

    /** On any failure, `unavailable` is set ONLY when there is no prior
     * `ready` state yet (via the functional updater, reading the latest
     * state rather than a stale closure) — this is what keeps a successful
     * dashboard from blanking on a transient poll failure. */
    function markUnavailable(reason: 'no-data' | 'error') {
      if (cancelled) return;
      setViewState((prev) => (prev.kind === 'ready' ? prev : { kind: 'unavailable', reason }));
    }

    async function poll() {
      let response: Response;
      try {
        response = await fetch('/api/decisions');
      } catch (err) {
        // Network-level failure (e.g. connection refused) — technical detail
        // stays in the console, never reaches the DOM (architecture-agnostic
        // UX requirement, proposal.md "Resolved: Cache-Miss / No-Data UX").
        console.error('GET /api/decisions failed:', err);
        markUnavailable('error');
        return;
      }

      if (response.status === 503) {
        markUnavailable('no-data');
        return;
      }

      if (!response.ok) {
        console.error(`GET /api/decisions failed with status ${response.status}`);
        markUnavailable('error');
        return;
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

      setChangedAssets(changed);
      setViewState({ kind: 'ready', report: data });
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (viewState.kind === 'loading') {
    return <p className="font-mono text-sm text-muted">Cargando…</p>;
  }

  if (viewState.kind === 'unavailable') {
    return <ServiceUnavailable reason={viewState.reason} />;
  }

  const report = viewState.report;
  const visible = selectByDirection(report, direction);
  const selectedDecision = selectedAsset ? (report.decisions.find((d) => d.asset === selectedAsset) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <DirectionFilter value={direction} onChange={setDirection} />

      {visible.length === 0 ? (
        report.decisions.length === 0 ? (
          // no-recommendation-filter-and-i18n D1: `no-active` fires only when
          // the report itself is empty — NO_RECOMMENDATION assets now render
          // their own muted card and are never "inactive" by themselves.
          <EmptyState variant="no-active" />
        ) : (
          // Safe per design.md's proof: `visible.length === 0` with a
          // non-empty report can only happen when `direction !== 'ALL'`
          // (an 'ALL' selection returns `report.decisions` verbatim).
          <EmptyState variant="filtered" direction={direction as Exclude<Direction, 'ALL'>} />
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

      {selectedDecision && <DrilldownPanel decision={selectedDecision} onClose={() => setSelectedAsset(null)} />}
    </div>
  );
}
