import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { aggregate, formatNumber } from '../../lib/utils';

type Row = Record<string, unknown>;

interface WidgetConfig {
  columnA?: string;
  columnB?: string;
  labelA?: string;
  labelB?: string;
  aggregation?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

interface ComparisonWidgetProps {
  rows: Row[];
  config: WidgetConfig;
}

export function ComparisonWidget({ rows, config }: ComparisonWidgetProps) {
  const colA = config.columnA || '';
  const colB = config.columnB || '';
  const agg = (config.aggregation || 'sum') as Parameters<typeof aggregate>[1];
  const decimals = config.decimals ?? 2;

  const valsA = rows.map((r) => Number(r[colA])).filter((v) => !isNaN(v));
  const valsB = rows.map((r) => Number(r[colB])).filter((v) => !isNaN(v));

  const valueA = valsA.length > 0 ? aggregate(valsA, agg) : 0;
  const valueB = valsB.length > 0 ? aggregate(valsB, agg) : 0;

  let pctChange: number | null = null;
  let trendDir: 'up' | 'down' | 'flat' = 'flat';
  if (valueA !== 0) {
    pctChange = ((valueB - valueA) / Math.abs(valueA)) * 100;
    trendDir = pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'flat';
  }

  const trendColor =
    trendDir === 'up'
      ? 'var(--color-success, #22c55e)'
      : trendDir === 'down'
      ? 'var(--color-error, #ef4444)'
      : 'var(--color-text-muted)';

  const fmt = (v: number) =>
    `${config.prefix ?? ''}${formatNumber(v, decimals)}${config.suffix ?? ''}`;

  return (
    <div className="flex items-center justify-center gap-4 h-full px-2">
      {/* Value A */}
      <div className="flex flex-col items-center gap-1 min-w-0">
        <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[100px]">
          {config.labelA || colA || 'A'}
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: 'var(--color-accent)' }}
        >
          {fmt(valueA)}
        </p>
      </div>

      {/* Arrow + pct */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div style={{ color: trendColor }}>
          {trendDir === 'up' ? (
            <TrendingUp size={20} />
          ) : trendDir === 'down' ? (
            <TrendingDown size={20} />
          ) : (
            <ArrowRight size={20} />
          )}
        </div>
        {pctChange !== null && (
          <span className="text-xs font-semibold tabular-nums" style={{ color: trendColor }}>
            {pctChange > 0 ? '+' : ''}
            {pctChange.toFixed(1)}%
          </span>
        )}
        {pctChange === null && (
          <Minus size={14} className="text-[var(--color-text-muted)]" />
        )}
      </div>

      {/* Value B */}
      <div className="flex flex-col items-center gap-1 min-w-0">
        <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[100px]">
          {config.labelB || colB || 'B'}
        </p>
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: trendColor }}
        >
          {fmt(valueB)}
        </p>
      </div>
    </div>
  );
}
