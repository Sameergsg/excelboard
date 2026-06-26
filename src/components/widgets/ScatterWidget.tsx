import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getChartColors } from '../../lib/themes';

type Row = Record<string, unknown>;

interface WidgetConfig {
  xColumn?: string;
  yColumn?: string;
}

interface ScatterWidgetProps {
  rows: Row[];
  config: WidgetConfig;
}

const TOOLTIP_STYLE = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 12,
};

export function ScatterWidget({ rows, config }: ScatterWidgetProps) {
  const xKey = config.xColumn || '';
  const yKey = config.yColumn || '';
  const colors = getChartColors();

  const chartData = rows
    .map((row) => ({
      x: Number(row[xKey]),
      y: Number(row[yKey]),
    }))
    .filter((p) => !isNaN(p.x) && !isNaN(p.y));

  return (
    <div style={{ height: '100%', minHeight: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            type="number"
            dataKey="x"
            name={xKey}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yKey}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ strokeDasharray: '3 3' }}
          />
          <Scatter
            name={`${xKey} vs ${yKey}`}
            data={chartData}
            fill={colors[0]}
            fillOpacity={0.7}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
