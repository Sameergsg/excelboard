import { useMemo } from 'react';
import type { ColMeta } from '../../types';
import { computeInsights, computeSWOT, computeHealthScore } from '../../lib/swot';
import { InsightsCard } from './InsightsCard';
import { SwotCard } from './SwotCard';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

type Row = Record<string, unknown>;

interface Props {
  cols: ColMeta[];
  rows: Row[];
  loading: boolean;
}

export function AutoAnalysis({ cols, rows, loading }: Props) {
  const insights = useMemo(() => {
    if (cols.length === 0 || rows.length === 0) return [];
    return computeInsights(cols, rows);
  }, [cols, rows]);

  const swot = useMemo(() => {
    if (cols.length === 0 || rows.length === 0) return null;
    return computeSWOT(cols, rows);
  }, [cols, rows]);

  const healthScore = useMemo(() => {
    if (cols.length === 0 || rows.length === 0) return 0;
    return computeHealthScore(cols, rows);
  }, [cols, rows]);

  const duplicateCount = useMemo(() => {
    if (rows.length === 0) return 0;
    const capped = rows.slice(0, 10000);
    const seen = new Set<string>();
    let dupes = 0;
    for (const row of capped) {
      const key = JSON.stringify(row);
      if (seen.has(key)) dupes++;
      else seen.add(key);
    }
    return dupes;
  }, [rows]);

  const overallNullPct = useMemo(() => {
    if (cols.length === 0) return 0;
    return cols.reduce((s, c) => s + c.stats.nullPct, 0) / cols.length;
  }, [cols]);

  const colTypeCounts = useMemo(() => ({
    numeric: cols.filter(c => c.data_type === 'numeric').length,
    date: cols.filter(c => c.data_type === 'date').length,
    categorical: cols.filter(c => c.data_type === 'categorical').length,
    text: cols.filter(c => c.data_type === 'text' || c.data_type === 'boolean').length,
  }), [cols]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Data Overview */}
      <Card className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Data Overview
        </h3>

        {/* Big stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Rows', value: rows.length.toLocaleString() },
            { label: 'Columns', value: cols.length.toString() },
            { label: 'Health', value: `${healthScore}%` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
                {value}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Duplicate count */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Duplicate rows</span>
          <span
            className="text-xs font-semibold"
            style={{ color: duplicateCount > 0 ? 'var(--color-error)' : 'var(--color-success)' }}
          >
            {duplicateCount.toLocaleString()}
          </span>
        </div>

        {/* Column type pills */}
        <div className="flex flex-wrap gap-1.5">
          {colTypeCounts.numeric > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'color-mix(in srgb,#3b82f6 15%,transparent)', color: '#3b82f6' }}>
              {colTypeCounts.numeric} Numeric
            </span>
          )}
          {colTypeCounts.date > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'color-mix(in srgb,#10b981 15%,transparent)', color: '#10b981' }}>
              {colTypeCounts.date} Date
            </span>
          )}
          {colTypeCounts.categorical > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'color-mix(in srgb,#8b5cf6 15%,transparent)', color: '#8b5cf6' }}>
              {colTypeCounts.categorical} Categorical
            </span>
          )}
          {colTypeCounts.text > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'color-mix(in srgb,#6b7280 15%,transparent)', color: '#6b7280' }}>
              {colTypeCounts.text} Text
            </span>
          )}
        </div>

        {/* Null pct */}
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>Overall missing data</span>
            <span>{(overallNullPct * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(overallNullPct * 100, 100)}%`,
                background: overallNullPct > 0.1 ? 'var(--color-error)' : 'var(--color-success)',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Card 2: Smart Insights */}
      <InsightsCard insights={insights} />

      {/* Card 3: SWOT */}
      <SwotCard swot={swot} />
    </div>
  );
}
