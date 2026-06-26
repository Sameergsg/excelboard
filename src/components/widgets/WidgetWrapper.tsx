import { useState } from 'react';
import { GripVertical, Pencil, X } from 'lucide-react';
import { applyWidgetFilters } from '../../lib/utils';
import { cn } from '../../lib/utils';

// Widget type imports
import { KpiCard } from './KpiCard';
import { LineWidget } from './LineWidget';
import { BarWidget } from './BarWidget';
import { AreaWidget } from './AreaWidget';
import { PieWidget } from './PieWidget';
import { ScatterWidget } from './ScatterWidget';
import { TableWidget } from './TableWidget';
import { GaugeWidget } from './GaugeWidget';
import { ComparisonWidget } from './ComparisonWidget';
import { TextWidget } from './TextWidget';

type Row = Record<string, unknown>;

// Minimal local type stubs — actual types come from src/types/index.ts
interface FilterRow {
  column: string;
  operator: string;
  value: string;
}

interface WidgetConfig {
  label?: string;
  column?: string;
  columnA?: string;
  columnB?: string;
  labelA?: string;
  labelB?: string;
  columns?: string[];
  xAxis?: string;
  yAxis?: string | string[];
  xColumn?: string;
  yColumn?: string;
  labelColumn?: string;
  valueColumn?: string;
  aggregation?: string;
  prefix?: string;
  suffix?: string;
  compareColumn?: string;
  decimals?: number;
  smooth?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  innerRadius?: boolean | string | number;
  maxSlices?: number;
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
  min?: number;
  max?: number;
  redThreshold?: number;
  greenThreshold?: number;
  target?: number;
  content?: string;
  bgColor?: string;
  borderStyle?: string;
  filters?: FilterRow[];
}

type WidgetType =
  | 'kpi'
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'scatter'
  | 'table'
  | 'gauge'
  | 'comparison'
  | 'text';

interface LocalWidget {
  id: string;
  widget_type: WidgetType;
  title?: string;
  config: WidgetConfig;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

interface WidgetWrapperProps {
  widget: LocalWidget;
  rows: Row[];
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function WidgetWrapper({
  widget,
  rows,
  editMode,
  onEdit,
  onDelete,
}: WidgetWrapperProps) {
  const [hovered, setHovered] = useState(false);

  // Apply widget-level filters
  const filteredRows = applyWidgetFilters(rows, widget.config.filters ?? []);

  // Custom style from config
  const cardStyle: React.CSSProperties = {};
  if (widget.config.bgColor) {
    cardStyle.background = widget.config.bgColor;
  }
  if (widget.config.borderStyle) {
    cardStyle.border = widget.config.borderStyle;
  }

  return (
    <div
      className={cn(
        'relative flex flex-col h-full rounded-xl border overflow-hidden',
        'bg-[var(--color-card)] border-[var(--color-border)]',
        editMode && 'ring-1 ring-[var(--color-border)]'
      )}
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Edit mode: drag handle */}
      {editMode && (
        <div
          className="absolute top-2 left-2 z-10 text-[var(--color-text-muted)] cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Edit mode: action buttons (pencil + X) on hover */}
      {editMode && hovered && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              'p-1 rounded-md transition-colors',
              'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-accent)] hover:text-white'
            )}
            title="Edit widget"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              'p-1 rounded-md transition-colors',
              'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-error,#ef4444)] hover:text-white'
            )}
            title="Delete widget"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Widget title */}
      {widget.title && (
        <div
          className={cn(
            'px-4 pt-3 pb-1 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider shrink-0',
            editMode && 'pl-8'
          )}
        >
          {widget.title}
        </div>
      )}

      {/* Widget content */}
      <div className={cn('flex-1 overflow-hidden', widget.title ? 'px-4 pb-4' : 'p-4')}>
        <WidgetContent type={widget.widget_type} rows={filteredRows} config={widget.config} />
      </div>
    </div>
  );
}

interface WidgetContentProps {
  type: WidgetType;
  rows: Row[];
  config: WidgetConfig;
}

function WidgetContent({ type, rows, config }: WidgetContentProps) {
  switch (type) {
    case 'kpi':
      return <KpiCard rows={rows} config={config} />;
    case 'line':
      return <LineWidget rows={rows} config={config} />;
    case 'bar':
      return <BarWidget rows={rows} config={config} />;
    case 'area':
      return <AreaWidget rows={rows} config={config} />;
    case 'pie':
      return <PieWidget rows={rows} config={config} />;
    case 'scatter':
      return <ScatterWidget rows={rows} config={config} />;
    case 'table':
      return <TableWidget rows={rows} config={config} />;
    case 'gauge':
      return <GaugeWidget rows={rows} config={config} />;
    case 'comparison':
      return <ComparisonWidget rows={rows} config={config} />;
    case 'text':
      return <TextWidget rows={rows} config={config} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)]">
          Unknown widget type: {type}
        </div>
      );
  }
}
