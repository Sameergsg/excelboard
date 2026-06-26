import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { aggregate } from '../../lib/utils';
import { getChartColors } from '../../lib/themes';

type Row = Record<string, unknown>;

interface WidgetConfig {
  labelColumn?: string;
  valueColumn?: string;
  aggregation?: string;
  innerRadius?: boolean | string | number;
  maxSlices?: number;
}

interface PieWidgetProps {
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

export function PieWidget({ rows, config }: PieWidgetProps) {
  const labelKey = config.labelColumn || '';
  const valueKey = config.valueColumn || '';
  const agg = (config.aggregation || 'sum') as Parameters<typeof aggregate>[1];
  const maxSlices = config.maxSlices ?? 8;
  const colors = getChartColors();

  // Group by label
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    const label = String(row[labelKey] ?? '');
    const val = Number(row[valueKey]);
    if (!isNaN(val)) {
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label)!.push(val);
    }
  }

  const allSlices = Array.from(grouped.entries())
    .map(([name, vals]) => ({ name, value: aggregate(vals, agg) }))
    .sort((a, b) => b.value - a.value);

  let chartData = allSlices;
  if (allSlices.length > maxSlices) {
    const top = allSlices.slice(0, maxSlices - 1);
    const otherValue = allSlices
      .slice(maxSlices - 1)
      .reduce((sum, s) => sum + s.value, 0);
    chartData = [...top, { name: 'Other', value: otherValue }];
  }

  const hasInner = config.innerRadius !== undefined && config.innerRadius !== false;
  const innerRadius = hasInner
    ? typeof config.innerRadius === 'number' || typeof config.innerRadius === 'string'
      ? config.innerRadius
      : '35%'
    : 0;

  return (
    <div style={{ height: '100%', minHeight: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius="70%"
            strokeWidth={0}
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
