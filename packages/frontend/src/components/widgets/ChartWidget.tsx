import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { Widget } from '../../types';
import { sourcesApi } from '../../lib/api';
import { Spinner } from '../ui/Spinner';
import { getChartColors } from '../../lib/themes';
import { aggregate } from '../../lib/utils';

const TOOLTIP_STYLE = { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontSize: 12 };
const AXIS_STYLE = { fontSize: 11, fill: 'var(--color-text-muted)' };

export function ChartWidget({ widget }: { widget: Widget }) {
  const { config, widget_type } = widget;
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = getChartColors();

  useEffect(() => {
    if (!widget.source_id) { setLoading(false); return; }
    sourcesApi.getData(widget.source_id, { pageSize: 999999, sheet: config.sheet }).then(r => {
      const rows: Record<string, unknown>[] = r.data;
      const xKey = config.xAxis || config.categoryColumn || '';
      const yKeys = config.yAxis?.length ? config.yAxis : (config.valueColumn ? [config.valueColumn] : []);

      if (!xKey || yKeys.length === 0) { setChartData([]); return; }

      if (widget_type === 'scatter') {
        setChartData(rows.map(row => ({ x: Number(row[config.xColumn || '']), y: Number(row[config.yColumn || '']) })).filter(p => !isNaN(p.x) && !isNaN(p.y)));
      } else if (widget_type === 'pie' || widget_type === 'heatmap') {
        const grouped: Record<string, number[]> = {};
        for (const row of rows) {
          const k = String(row[xKey] || 'Unknown');
          if (!grouped[k]) grouped[k] = [];
          grouped[k].push(Number(row[yKeys[0]]) || 0);
        }
        setChartData(Object.entries(grouped).sort(([,a],[,b]) => b.reduce((s,v) => s+v,0) - a.reduce((s,v) => s+v,0)).slice(0, config.maxSlices || 10).map(([name, vals]) => ({ name, value: vals.reduce((a, b) => a + b, 0) })));
      } else {
        const grouped: Record<string, Record<string, number[]>> = {};
        for (const row of rows) {
          const k = String(row[xKey] || '');
          if (!k) continue;
          if (!grouped[k]) grouped[k] = {};
          for (const y of yKeys) {
            if (!grouped[k][y]) grouped[k][y] = [];
            grouped[k][y].push(Number(row[y]) || 0);
          }
        }
        setChartData(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([key, vals]) => {
          const point: Record<string, unknown> = { [xKey]: key };
          for (const y of yKeys) point[y] = aggregate((vals[y] || []).map(v => isNaN(v) ? null : v), config.aggregation || 'sum');
          return point;
        }));
      }
    }).finally(() => setLoading(false));
  }, [widget.source_id, JSON.stringify(config), widget_type]);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner /></div>;
  if (!chartData.length) return <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">No data — check widget config</div>;

  const yKeys = config.yAxis?.length ? config.yAxis : (config.valueColumn ? [config.valueColumn] : []);
  const xKey = config.xAxis || config.categoryColumn || '';

  const commonProps = {
    data: chartData,
    margin: { top: 4, right: 8, bottom: 4, left: 8 },
  };

  function axes() {
    return (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} />
        <YAxis tick={AXIS_STYLE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {config.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </>
    );
  }

  return (
    <div className="h-full w-full" style={{ minHeight: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        {widget_type === 'line' ? (
          <LineChart {...commonProps}>
            {axes()}
            {yKeys.map((y: string, i: number) => <Line key={y} type={config.smooth ? 'monotone' : 'linear'} dataKey={y} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        ) : widget_type === 'area' ? (
          <AreaChart {...commonProps}>
            {axes()}
            {yKeys.map((y: string, i: number) => <Area key={y} type="monotone" dataKey={y} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} strokeWidth={2} />)}
          </AreaChart>
        ) : widget_type === 'bar' ? (
          <BarChart {...commonProps} layout={config.horizontal ? 'vertical' : 'horizontal'}>
            {axes()}
            {yKeys.map((y: string, i: number) => <Bar key={y} dataKey={y} fill={colors[i % colors.length]} stackId={config.stacked ? 'stack' : undefined} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        ) : widget_type === 'pie' ? (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" innerRadius={config.maxSlices ? '40%' : '0%'}>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {config.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
          </PieChart>
        ) : widget_type === 'scatter' ? (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="x" type="number" tick={AXIS_STYLE} />
            <YAxis dataKey="y" type="number" tick={AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Scatter data={chartData} fill={colors[0]} />
          </ScatterChart>
        ) : (
          <BarChart {...commonProps}>{axes()}{yKeys.map((y: string, i: number) => <Bar key={y} dataKey={y} fill={colors[i % colors.length]} />)}</BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
