import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { aggregate } from '../../lib/utils';
import { getChartColors } from '../../lib/themes';

type Row = Record<string, unknown>;

interface WidgetConfig {
  xAxis?: string;
  yAxis?: string | string[];
  aggregation?: string;
  smooth?: boolean;
}

interface AreaWidgetProps {
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

export function AreaWidget({ rows, config }: AreaWidgetProps) {
  const xKey = config.xAxis || '';
  const yKeys = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
    ? [config.yAxis]
    : [];
  const agg = (config.aggregation || 'sum') as Parameters<typeof aggregate>[1];
  const colors = getChartColors();

  // Group by xAxis
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const xVal = String(row[xKey] ?? '');
    if (!grouped.has(xVal)) grouped.set(xVal, []);
    grouped.get(xVal)!.push(row);
  }

  const chartData = Array.from(grouped.entries()).map(([x, grpRows]) => {
    const point: Record<string, unknown> = { [xKey]: x };
    for (const yk of yKeys) {
      const vals = grpRows.map((r) => Number(r[yk])).filter((v) => !isNaN(v));
      point[yk] = vals.length > 0 ? aggregate(vals, agg) : 0;
    }
    return point;
  });

  return (
    <div style={{ height: '100%', minHeight: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <defs>
            {yKeys.map((yk, i) => (
              <linearGradient key={yk} id={`grad-${yk}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {yKeys.map((yk, i) => (
            <Area
              key={yk}
              type={config.smooth ? 'monotone' : 'linear'}
              dataKey={yk}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              fill={`url(#grad-${yk})`}
              fillOpacity={0.2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
