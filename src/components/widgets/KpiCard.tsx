import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { aggregate, formatNumber } from '../../lib/utils';

type Row = Record<string, unknown>;

interface WidgetConfig {
  label?: string;
  column?: string;
  aggregation?: string;
  prefix?: string;
  suffix?: string;
  compareColumn?: string;
  decimals?: number;
}

interface KpiCardProps {
  rows: Row[];
  config: WidgetConfig;
}

export function KpiCard({ rows, config }: KpiCardProps) {
  const col = config.column || '';
  const agg = (config.aggregation || 'sum') as Parameters<typeof aggregate>[1];

  const vals = rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
  const value = vals.length > 0 ? aggregate(vals, agg) : 0;

  let pctChange: number | null = null;
  let trendDir: 'up' | 'down' | 'flat' = 'flat';

  if (config.compareColumn) {
    const compareVals = rows
      .map((r) => Number(r[config.compareColumn!]))
      .filter((v) => !isNaN(v));
    if (compareVals.length > 0) {
      const compareValue = aggregate(compareVals, agg);
      if (compareValue !== 0) {
        pctChange = ((value - compareValue) / Math.abs(compareValue)) * 100;
        trendDir = pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'flat';
      }
    }
  }

  const label = config.label || col || 'Value';
  const decimals = config.decimals ?? 2;
  const displayValue = formatNumber(value, decimals);

  return (
    <div className="flex flex-col h-full justify-center gap-1 p-2">
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider truncate">
        {label}
      </p>

      <div className="flex items-baseline gap-1">
        {config.prefix && (
          <span className="text-lg font-semibold text-[var(--color-text-secondary)]">
            {config.prefix}
          </span>
        )}
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: 'var(--color-accent)' }}
        >
          {displayValue}
        </span>
        {config.suffix && (
          <span className="text-lg font-semibold text-[var(--color-text-secondary)]">
            {config.suffix}
          </span>
        )}
      </div>

      {pctChange !== null && (
        <div
          className="flex items-center gap-1 text-sm font-medium"
          style={{
            color:
              trendDir === 'up'
                ? 'var(--color-success, #22c55e)'
                : trendDir === 'down'
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-text-muted)',
          }}
        >
          {trendDir === 'up' ? (
            <TrendingUp size={14} />
          ) : trendDir === 'down' ? (
            <TrendingDown size={14} />
          ) : (
            <Minus size={14} />
          )}
          <span>
            {pctChange > 0 ? '+' : ''}
            {pctChange.toFixed(1)}%
          </span>
          <span className="text-xs text-[var(--color-text-muted)] font-normal">
            vs {config.compareColumn}
          </span>
        </div>
      )}

      {vals.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">No data</p>
      )}
    </div>
  );
}
