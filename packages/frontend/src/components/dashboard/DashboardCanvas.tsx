import { useEffect, useMemo } from 'react';
import GridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { ColMeta, LocalWidget, WidgetType, WidgetConfig } from '../../types';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { aggregate } from '../../lib/utils';

type Row = Record<string, unknown>;

// ── Widget renderers (inline, local-data-aware) ─────────────────────────────

function LocalKpiCard({ widget, rows }: { widget: LocalWidget; rows: Row[] }) {
  const { config } = widget;
  let value: number | string = '—';
  if (config.column === '__count__') {
    value = rows.length.toLocaleString();
  } else if (config.column) {
    const nums = rows
      .map(r => Number(r[config.column!]))
      .filter(n => !isNaN(n));
    const agg = aggregate(nums.map(n => n), config.aggregation ?? 'sum');
    value = agg >= 1_000_000
      ? `${(agg / 1_000_000).toFixed(1)}M`
      : agg >= 1_000
      ? `${(agg / 1_000).toFixed(1)}K`
      : Number.isInteger(agg)
      ? agg.toString()
      : agg.toFixed(2);
  }
  return (
    <div className="flex flex-col justify-center h-full px-4">
      <p className="text-xs mb-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
        {config.label ?? config.title ?? config.column ?? 'KPI'}
      </p>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
        {config.prefix}{value}{config.suffix}
      </div>
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
        {config.aggregation ?? 'sum'}
      </p>
    </div>
  );
}

// ── Default widget builder ──────────────────────────────────────────────────

function buildDefaultWidgets(cols: ColMeta[], allRows: Row[]): LocalWidget[] {
  const widgets: LocalWidget[] = [];
  let x = 0;
  let y = 0;

  const numericCols = cols.filter(c => c.data_type === 'numeric').slice(0, 4);
  const dateCols = cols.filter(c => c.data_type === 'date');
  const categoricalCols = cols.filter(c => c.data_type === 'categorical');

  // Total rows KPI
  widgets.push({
    id: `w-count-${Date.now()}`,
    widget_type: 'kpi',
    config: {
      title: 'Total Rows',
      label: 'Total Rows',
      column: '__count__',
      aggregation: 'count',
    },
    position: { x, y, w: 3, h: 2 },
  });
  x += 3;

  // Numeric KPIs
  for (const col of numericCols) {
    if (x + 3 > 12) { x = 0; y += 2; }
    widgets.push({
      id: `w-kpi-${col.name}-${Date.now()}`,
      widget_type: 'kpi',
      config: {
        title: col.display_name,
        label: col.display_name,
        column: col.name,
        aggregation: 'sum',
      },
      position: { x, y, w: 3, h: 2 },
    });
    x += 3;
  }

  y += 2;
  x = 0;

  // Line chart: date + numeric
  if (dateCols.length > 0 && numericCols.length > 0) {
    const kpiConfig: WidgetConfig = {
      title: `${numericCols[0].display_name} over Time`,
      xAxis: dateCols[0].name,
      yAxis: [numericCols[0].name],
    };
    widgets.push({
      id: `w-line-${Date.now()}`,
      widget_type: 'line' as WidgetType,
      config: kpiConfig,
      position: { x, y, w: 6, h: 4 },
    });
    x += 6;
  }

  // Bar chart: categorical + numeric
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    if (x + 6 > 12) { x = 0; y += 4; }
    widgets.push({
      id: `w-bar-${Date.now()}`,
      widget_type: 'bar' as WidgetType,
      config: {
        title: `${numericCols[0].display_name} by ${categoricalCols[0].display_name}`,
        xAxis: categoricalCols[0].name,
        yAxis: [numericCols[0].name],
      },
      position: { x, y, w: 6, h: 4 },
    });
    x += 6;
  }

  // Pie chart
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    if (x + 4 > 12) { x = 0; y += 4; }
    widgets.push({
      id: `w-pie-${Date.now()}`,
      widget_type: 'pie' as WidgetType,
      config: {
        title: `${categoricalCols[0].display_name} Distribution`,
        categoryColumn: categoricalCols[0].name,
        valueColumn: numericCols[0].name,
      },
      position: { x, y, w: 4, h: 4 },
    });
    x += 4;
  }

  // Data table — always add
  const tableY = y + 4;
  widgets.push({
    id: `w-table-${Date.now()}`,
    widget_type: 'table' as WidgetType,
    config: {
      title: 'Data Table',
      columns: cols.slice(0, 8).map(c => c.name),
      pageSize: 10,
      searchable: true,
      sortable: true,
    },
    position: { x: 0, y: tableY, w: 12, h: 5 },
  });

  // Use allRows to avoid unused var lint
  void allRows;

  return widgets;
}

// ── Main canvas ─────────────────────────────────────────────────────────────

interface Props {
  sourceId: string;
  sheetName: string;
  rows: Row[];
  allRows: Row[];
  cols: ColMeta[];
  editMode: boolean;
  onAddWidget: () => void;
}

export function DashboardCanvas({ sourceId, sheetName, rows, allRows, cols, editMode, onAddWidget }: Props) {
  const { widgets, setWidgets, loadWidgets } = useDashboardStore();
  const layoutKey = `eb-layout-${sourceId}-${sheetName}`;

  // Load widgets for this source+sheet
  useEffect(() => {
    loadWidgets(sourceId, sheetName);
  }, [sourceId, sheetName, loadWidgets]);

  // Build defaults if no saved widgets and data is ready
  useEffect(() => {
    if (widgets.length === 0 && cols.length > 0) {
      const defaults = buildDefaultWidgets(cols, allRows);
      setWidgets(defaults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols.length, widgets.length]);

  // Compute layout from widget positions
  const layout: Layout[] = useMemo(
    () =>
      widgets.map(w => ({
        i: w.id,
        x: w.position.x,
        y: w.position.y,
        w: w.position.w,
        h: w.position.h,
        minW: 2,
        minH: 2,
      })),
    [widgets]
  );

  const handleLayoutChange = (newLayout: Layout[]) => {
    localStorage.setItem(layoutKey, JSON.stringify(newLayout));
    const updated = widgets.map(w => {
      const l = newLayout.find(n => n.i === w.id);
      if (!l) return w;
      return { ...w, position: { x: l.x, y: l.y, w: l.w, h: l.h } };
    });
    setWidgets(updated);
  };

  if (widgets.length === 0 && cols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
          No widgets yet
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Load data or add a widget to get started
        </p>
        <button
          onClick={onAddWidget}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-accent)' }}
        >
          + Add Widget
        </button>
      </div>
    );
  }

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={80}
      margin={[12, 12]}
      width={Math.max(typeof window !== 'undefined' ? window.innerWidth - 300 : 1200, 600)}
      isDraggable={editMode}
      isResizable={editMode}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".drag-handle"
    >
      {widgets.map(widget => (
        <div
          key={widget.id}
          className="rounded-xl border overflow-hidden"
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Widget header */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {editMode && (
              <span
                className="drag-handle cursor-grab active:cursor-grabbing text-xs select-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ⠿
              </span>
            )}
            <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--color-text)' }}>
              {widget.config.title ?? widget.widget_type}
            </span>
          </div>

          {/* Widget body */}
          <div className="h-[calc(100%-36px)]">
            {widget.widget_type === 'kpi' && (
              <LocalKpiCard widget={widget} rows={rows} />
            )}
            {widget.widget_type !== 'kpi' && (
              <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {widget.widget_type} chart — {rows.length} rows
              </div>
            )}
          </div>
        </div>
      ))}
    </GridLayout>
  );
}
