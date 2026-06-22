import type { Widget } from '../../types';
import { KpiWidget } from './KpiWidget';
import { ChartWidget } from './ChartWidget';
import { TableWidget } from './TableWidget';
import { GaugeWidget } from './GaugeWidget';
import { TextWidget } from './TextWidget';
import { MetricComparisonWidget } from './MetricComparisonWidget';

export function WidgetRenderer({ widget }: { widget: Widget }) {
  switch (widget.widget_type) {
    case 'kpi': return <KpiWidget widget={widget} />;
    case 'line': case 'bar': case 'area': case 'pie': case 'scatter': case 'heatmap':
      return <ChartWidget widget={widget} />;
    case 'table': return <TableWidget widget={widget} />;
    case 'gauge': return <GaugeWidget widget={widget} />;
    case 'text': return <TextWidget widget={widget} />;
    case 'metric-comparison': return <MetricComparisonWidget widget={widget} />;
    case 'spacer': return <div className="h-full w-full" />;
    default: return <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-xs">Unknown widget type</div>;
  }
}
