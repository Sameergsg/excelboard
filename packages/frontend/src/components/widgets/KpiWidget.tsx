import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Widget } from '../../types';
import { sourcesApi } from '../../lib/api';
import { formatNumber, aggregate } from '../../lib/utils';
import { Spinner } from '../ui/Spinner';

export function KpiWidget({ widget }: { widget: Widget }) {
  const { config } = widget;
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!widget.source_id || !config.column) { setLoading(false); return; }
    sourcesApi.getData(widget.source_id, { pageSize: 999999, sheet: config.sheet }).then(r => {
      const vals = r.data.map((row: Record<string, unknown>) => Number(row[config.column!]));
      setValue(aggregate(vals.map((v: number) => isNaN(v) ? null : v), config.aggregation || 'sum'));
    }).finally(() => setLoading(false));
  }, [widget.source_id, config.column, config.aggregation, config.sheet]);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner /></div>;

  const isPositive = (value ?? 0) >= 0;

  return (
    <div className="flex flex-col justify-center h-full px-2">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{config.label || config.column}</p>
      <div className="text-3xl font-bold text-[var(--color-text)]">
        {config.prefix}{formatNumber(value)}{config.suffix}
      </div>
      <div className="flex items-center gap-1 mt-1">
        {isPositive ? <TrendingUp size={14} style={{ color: 'var(--color-success)' }} /> : <TrendingDown size={14} style={{ color: 'var(--color-error)' }} />}
        <span className="text-xs text-[var(--color-text-muted)]">{config.aggregation || 'sum'}</span>
      </div>
    </div>
  );
}
