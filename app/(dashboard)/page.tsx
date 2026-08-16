'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Decision, DecisionReport } from '@/src/domain/types';
import { DecisionTable } from './components/DecisionTable';
import { ArgumentTrace } from './components/ArgumentTrace';
import { AssetFilter } from './components/AssetFilter';

/**
 * Decision dashboard (design.md decision-dashboard spec, task 7.1): minimal
 * tabular decision list + multi-asset filter + argument-trace detail table.
 * Deliberately NO narrative text and NO graph visualization — both deferred
 * to v2 per approved deviation D3. Fetches from GET /api/decisions.
 */
export default function DashboardPage() {
  const [report, setReport] = useState<DecisionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState<string | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Decision | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/decisions');
        if (!response.ok) {
          throw new Error(`GET /api/decisions failed with status ${response.status}`);
        }
        const data = (await response.json()) as DecisionReport;
        if (!cancelled) {
          setReport(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error loading decisions');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const decisions = useMemo(() => {
    const all = report?.decisions ?? [];
    if (assetFilter === 'ALL') return all;
    return all.filter((d) => d.asset === assetFilter);
  }, [report, assetFilter]);

  return (
    <main>
      <h1>FAF Platform — Decision Dashboard</h1>

      {error && <p role="alert">{error}</p>}

      <AssetFilter selected={assetFilter} onChange={setAssetFilter} />

      <DecisionTable decisions={decisions} selectedAsset={selected?.asset ?? null} onSelect={setSelected} />

      {selected && <ArgumentTrace decision={selected} />}
    </main>
  );
}
