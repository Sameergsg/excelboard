import { useEffect, useState } from 'react';
import type { Widget } from '../../types';
import { sourcesApi } from '../../lib/api';
import { aggregate } from '../../lib/utils';

export function GaugeWidget({ widget }: { widget: Widget }) {
  const { config } = widget;
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!widget.source_id || !config.column) return;
    sourcesApi.getData(widget.source_id, { pageSize: 999999, sheet: config.sheet }).then(r => {
      const vals = r.data.map((row: Record<string, unknown>) => Number(row[config.column!]));
      setValue(aggregate(vals.map((v: number) => isNaN(v) ? null : v), config.aggregation || 'sum'));
    });
  }, [widget.source_id, config.column, config.aggregation]);

  const min = config.minVal || 0;
  const max = config.maxVal || 100;
  const target = config.target;
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const color = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
  const r = 52, cx = 70, cy = 70;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <svg width={140} height={80} viewBox="0 0 140 80">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--color-bg-secondary)" strokeWidth={14} />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth={14} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
        {target !== undefined && (
          <line
            x1={cx + r * Math.cos(Math.PI * (1 - (target - min) / (max - min)))}
            y1={cy - r * Math.sin(Math.PI * (1 - (target - min) / (max - min)))}
            x2={cx + (r - 20) * Math.cos(Math.PI * (1 - (target - min) / (max - min)))}
            y2={cy - (r - 20) * Math.sin(Math.PI * (1 - (target - min) / (max - min)))}
            stroke="var(--color-warning)" strokeWidth={2} />
        )}
      </svg>
      <div className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-xs text-[var(--color-text-muted)]">{config.label || config.column}</div>
    </div>
  );
}
