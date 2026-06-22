import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Widget } from '../../types';
import { sourcesApi } from '../../lib/api';
import { formatNumber, aggregate } from '../../lib/utils';

export function MetricComparisonWidget({ widget }: { widget: Widget }) {
  const { config } = widget;
  const [val1, setVal1] = useState<number | null>(null);
  const [val2, setVal2] = useState<number | null>(null);

  useEffect(() => {
    if (!widget.source_id) return;
    sourcesApi.getData(widget.source_id, { pageSize: 10000, sheet: config.sheet }).then(r => {
      const rows: Record<string, unknown>[] = r.data;
      if (config.column) {
        const v = rows.map(row => Number(row[config.column!]));
        setVal1(aggregate(v.map(x => isNaN(x) ? null : x), config.aggregation || 'sum'));
      }
      if (config.column2) {
        const v = rows.map(row => Number(row[config.column2!]));
        setVal2(aggregate(v.map(x => isNaN(x) ? null : x), config.aggregation2 || 'sum'));
      }
    });
  }, [widget.source_id, config.column, config.column2]);

  const pctChange = val1 && val2 && val1 !== 0 ? ((val2 - val1) / Math.abs(val1)) * 100 : null;

  return (
    <div className="flex items-center justify-around h-full px-2">
      <div className="text-center">
        <p className="text-xs text-[var(--color-text-muted)]">{config.label || config.column}</p>
        <p className="text-2xl font-bold text-[var(--color-text)]">{formatNumber(val1)}</p>
      </div>
      <div className="flex flex-col items-center">
        {pctChange !== null ? (
          <>
            {pctChange > 0 ? <TrendingUp size={20} style={{ color: 'var(--color-success)' }} /> : pctChange < 0 ? <TrendingDown size={20} style={{ color: 'var(--color-error)' }} /> : <Minus size={20} />}
            <span className="text-xs font-medium mt-0.5" style={{ color: pctChange > 0 ? 'var(--color-success)' : pctChange < 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
              {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
            </span>
          </>
        ) : <Minus size={20} className="text-[var(--color-text-muted)]" />}
      </div>
      <div className="text-center">
        <p className="text-xs text-[var(--color-text-muted)]">{config.column2}</p>
        <p className="text-2xl font-bold text-[var(--color-text)]">{formatNumber(val2)}</p>
      </div>
    </div>
  );
}
