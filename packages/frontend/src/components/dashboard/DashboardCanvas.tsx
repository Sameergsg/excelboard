import { useEffect, useMemo, useState, useRef, lazy, Suspense } from 'react';

const KpiBuilderModal = lazy(() => import('../kpi-builder/KpiBuilderModal'));
import GridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ColMeta, LocalWidget, WidgetType, WidgetConfig } from '../../types';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { aggregate, applyWidgetFilters } from '../../lib/utils';
import { getChartColors } from '../../lib/themes';

type Row = Record<string, unknown>;

const TOOLTIP_STYLE = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 12,
};
const AXIS_TICK = { fontSize: 11, fill: 'var(--color-text-muted)' };

// ─── Per-widget inline renderers (use pre-fetched rows, no extra API calls) ───

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function groupAndAggregate(
  rows: Row[],
  xKey: string,
  yKeys: string[],
  method = 'sum',
): Record<string, unknown>[] {
  const map: Record<string, Record<string, number[]>> = {};
  for (const row of rows) {
    const k = String(row[xKey] ?? '');
    if (!k) continue;
    if (!map[k]) map[k] = {};
    for (const y of yKeys) {
      const n = Number(row[y]);
      if (!isNaN(n)) { (map[k][y] ??= []).push(n); }
    }
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, vals]) => {
    const point: Record<string, unknown> = { [xKey]: key };
    for (const y of yKeys) point[y] = aggregate((vals[y] ?? []).map(v => v), method);
    return point;
  });
}

function WidgetBody({ widget, rows, colors }: { widget: LocalWidget; rows: Row[]; colors: string[] }) {
  const { config, widget_type } = widget;

  // Apply per-widget filters
  const filteredRows = useMemo(() => {
    if (!config.filters?.length) return rows;
    return applyWidgetFilters(rows, config.filters);
  }, [rows, config.filters]);

  if (filteredRows.length === 0 && rows.length > 0) {
    return <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-text-muted)' }}>No data matches widget filters</div>;
  }
  if (rows.length === 0) {
    return <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading data…</div>;
  }

  // ── KPI ──
  if (widget_type === 'kpi') {
    let value = '—';
    if (config.column === '__count__') {
      value = filteredRows.length.toLocaleString();
    } else if (config.column) {
      const nums = filteredRows.map(r => Number(r[config.column!])).filter(n => !isNaN(n));
      value = fmt(aggregate(nums, config.aggregation ?? 'sum'));
    }
    return (
      <div className="flex flex-col justify-center h-full px-4">
        <p className="text-xs mb-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
          {config.label ?? config.title ?? config.column ?? 'KPI'}
        </p>
        <div className="text-2xl font-bold leading-none" style={{ color: 'var(--color-accent)' }}>
          {config.prefix}{value}{config.suffix}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{config.aggregation ?? 'sum'}</p>
      </div>
    );
  }

  // ── TEXT ──
  if (widget_type === 'text' || widget_type === 'spacer') {
    return (
      <div className="h-full overflow-auto px-4 py-2 text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
        {config.content || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No content</span>}
      </div>
    );
  }

  // ── TABLE ──
  if (widget_type === 'table') {
    const cols = config.columns?.length ? config.columns : Object.keys(filteredRows[0] || {}).slice(0, 8);
    const pageSize = config.pageSize ?? 20;
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ background: 'var(--color-bg-secondary)' }}>
            <tr>{cols.map(c => <th key={c} className="px-2 py-1.5 text-left font-medium border-b whitespace-nowrap" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, pageSize).map((row, i) => (
              <tr key={i} className="border-b hover:opacity-80" style={{ borderColor: 'var(--color-border)' }}>
                {cols.map(c => <td key={c} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{String(row[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length > pageSize && (
          <p className="text-center text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
            Showing {pageSize} of {filteredRows.length} rows
          </p>
        )}
      </div>
    );
  }

  // ── COMPARISON ──
  if (widget_type === 'comparison') {
    const v1 = config.column ? aggregate(filteredRows.map(r => { const n = Number(r[config.column!]); return isNaN(n) ? null : n; }), config.aggregation ?? 'sum') : null;
    const v2 = config.column2 ? aggregate(filteredRows.map(r => { const n = Number(r[config.column2!]); return isNaN(n) ? null : n; }), config.aggregation2 ?? 'sum') : null;
    const pct = v1 && v2 && v1 !== 0 ? ((v2 - v1) / Math.abs(v1)) * 100 : null;
    return (
      <div className="flex items-center justify-around h-full px-2">
        <div className="text-center"><p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{config.label ?? config.column}</p><p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{v1 !== null ? fmt(v1) : '—'}</p></div>
        <div className="flex flex-col items-center">
          {pct !== null ? (<><span className="text-xl">{pct > 0 ? '↑' : '↓'}</span><span className="text-xs font-semibold" style={{ color: pct > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span></>) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
        </div>
        <div className="text-center"><p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{config.label2 ?? config.column2}</p><p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{v2 !== null ? fmt(v2) : '—'}</p></div>
      </div>
    );
  }

  // ── GAUGE ──
  if (widget_type === 'gauge') {
    const nums = config.column ? filteredRows.map(r => { const n = Number(r[config.column!]); return isNaN(n) ? null : n; }) : [];
    const value = aggregate(nums, config.aggregation ?? 'sum');
    const min = config.minVal ?? 0, max = config.maxVal ?? 100;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const gColor = pct >= (config.greenThreshold ?? 70) ? 'var(--color-success)' : pct >= (config.redThreshold ?? 30) ? 'var(--color-warning)' : 'var(--color-error)';
    const r2 = 52, cx = 70, cy = 70, circ = Math.PI * r2;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <svg width={140} height={80} viewBox="0 0 140 80">
          <path d={`M ${cx - r2} ${cy} A ${r2} ${r2} 0 0 1 ${cx + r2} ${cy}`} fill="none" stroke="var(--color-bg-secondary)" strokeWidth={14} />
          <path d={`M ${cx - r2} ${cy} A ${r2} ${r2} 0 0 1 ${cx + r2} ${cy}`} fill="none" stroke={gColor} strokeWidth={14} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
        </svg>
        <div className="text-xl font-bold" style={{ color: gColor }}>{fmt(value)}</div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{config.label ?? config.column}</div>
      </div>
    );
  }

  // ── PIE / DONUT ──
  if (widget_type === 'pie') {
    const xKey = config.categoryColumn ?? config.xAxis ?? '';
    const yKey = config.valueColumn ?? '';
    const grouped: Record<string, number> = {};
    for (const row of filteredRows) {
      const k = String(row[xKey] ?? 'Unknown');
      const n = yKey ? Number(row[yKey]) : 1;
      grouped[k] = (grouped[k] ?? 0) + (isNaN(n) ? 1 : n);
    }
    const pieData = Object.entries(grouped).sort(([, a], [, b]) => b - a).slice(0, config.maxSlices ?? 8).map(([name, value]) => ({ name, value }));
    return (
      <div style={{ height: '100%', minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%" innerRadius={config.innerRadius ? '35%' : '0%'}>
              {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {config.showLegend !== false && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── LINE / AREA / BAR ──
  const xKey = config.xAxis ?? config.categoryColumn ?? '';
  const yKeys = config.yAxis?.length ? config.yAxis : (config.valueColumn ? [config.valueColumn] : []);
  if (!xKey || yKeys.length === 0) {
    return <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-text-muted)' }}>Configure axes in Edit mode</div>;
  }
  const chartData = groupAndAggregate(filteredRows, xKey, yKeys, config.aggregation ?? 'sum');

  function axes() {
    return <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
      <XAxis dataKey={xKey} tick={AXIS_TICK} />
      <YAxis tick={AXIS_TICK} />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {config.showLegend !== false && yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
    </>;
  }

  return (
    <div style={{ height: '100%', minHeight: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        {widget_type === 'line' ? (
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            {axes()}{yKeys.map((y, i) => <Line key={y} type={config.smooth ? 'monotone' : 'linear'} dataKey={y} stroke={colors[i % colors.length]} strokeWidth={2} dot={!!config.showDots} />)}
          </LineChart>
        ) : widget_type === 'area' ? (
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            {axes()}{yKeys.map((y, i) => <Area key={y} type="monotone" dataKey={y} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} strokeWidth={2} />)}
          </AreaChart>
        ) : (
          <BarChart data={chartData} layout={config.horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            {config.horizontal
              ? <><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis type="number" tick={AXIS_TICK} /><YAxis type="category" dataKey={xKey} tick={AXIS_TICK} width={80} /><Tooltip contentStyle={TOOLTIP_STYLE} /></>
              : axes()
            }
            {yKeys.map((y, i) => <Bar key={y} dataKey={y} fill={colors[i % colors.length]} stackId={config.stacked ? 's' : undefined} radius={[3, 3, 0, 0]} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ─── Default widget builder ──────────────────────────────────────────────────

function buildDefaultWidgets(cols: ColMeta[], _allRows: Row[]): LocalWidget[] {
  const widgets: LocalWidget[] = [];
  let x = 0, y = 0;
  const numericCols = cols.filter(c => c.data_type === 'numeric').slice(0, 4);
  const dateCols = cols.filter(c => c.data_type === 'date');
  const categoricalCols = cols.filter(c => c.data_type === 'categorical');
  const ts = Date.now();

  // Total rows
  widgets.push({ id: `w-count-${ts}`, widget_type: 'kpi', config: { title: 'Total Rows', column: '__count__' }, position: { x, y, w: 3, h: 2 } });
  x += 3;

  // Numeric KPI cards
  for (const col of numericCols) {
    if (x + 3 > 12) { x = 0; y += 2; }
    widgets.push({ id: `w-kpi-${col.name}-${ts}`, widget_type: 'kpi', config: { title: col.display_name, column: col.name, aggregation: 'sum', label: col.display_name }, position: { x, y, w: 3, h: 2 } });
    x += 3;
  }
  y += 2; x = 0;

  // Line chart
  if (dateCols.length > 0 && numericCols.length > 0) {
    widgets.push({ id: `w-line-${ts}`, widget_type: 'line', config: { title: `${numericCols[0].display_name} over time`, xAxis: dateCols[0].name, yAxis: [numericCols[0].name], smooth: true }, position: { x, y, w: 6, h: 4 } });
    x += 6;
  }

  // Bar chart
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    if (x + 6 > 12) { x = 0; y += 4; }
    widgets.push({ id: `w-bar-${ts}`, widget_type: 'bar', config: { title: `${numericCols[0].display_name} by ${categoricalCols[0].display_name}`, xAxis: categoricalCols[0].name, yAxis: [numericCols[0].name] }, position: { x, y, w: 6, h: 4 } });
    x += 6;
  }

  // Pie chart
  if (categoricalCols.length > 0) {
    if (x + 4 > 12) { x = 0; y += 4; }
    widgets.push({ id: `w-pie-${ts}`, widget_type: 'pie', config: { title: `${categoricalCols[0].display_name} Distribution`, categoryColumn: categoricalCols[0].name, valueColumn: numericCols[0]?.name, maxSlices: 8 }, position: { x, y, w: 4, h: 4 } });
  }

  // Data table
  const tableY = y + 4;
  widgets.push({ id: `w-table-${ts}`, widget_type: 'table', config: { title: 'Data Preview', columns: cols.slice(0, 8).map(c => c.name), pageSize: 20, searchable: true }, position: { x: 0, y: tableY, w: 12, h: 5 } });

  return widgets;
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────

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
  const { widgets, setWidgets, loadWidgets, removeWidget, updateWidget } = useDashboardStore();
  const [editingWidget, setEditingWidget] = useState<LocalWidget | null>(null);
  const colors = getChartColors();
  const layoutKey = `eb-layout-${sourceId}-${sheetName}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);

  useEffect(() => {
    const update = () => { if (containerRef.current) setWidth(containerRef.current.clientWidth); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Load widgets for this source+sheet
  useEffect(() => {
    loadWidgets(sourceId, sheetName);
  }, [sourceId, sheetName, loadWidgets]);

  // Build defaults if no saved widgets and data ready
  useEffect(() => {
    if (widgets.length === 0 && cols.length > 0 && allRows.length > 0) {
      setWidgets(buildDefaultWidgets(cols, allRows));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols.length, allRows.length]);

  const layout: Layout[] = useMemo(
    () => widgets.map(w => ({ i: w.id, x: w.position.x, y: w.position.y, w: w.position.w, h: w.position.h, minW: 2, minH: 2 })),
    [widgets],
  );

  const handleLayoutChange = (newLayout: Layout[]) => {
    if (!editMode) return;
    localStorage.setItem(layoutKey, JSON.stringify(newLayout));
    const updated = widgets.map(w => {
      const l = newLayout.find(n => n.i === w.id);
      return l ? { ...w, position: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
    });
    setWidgets(updated);
  };

  if (widgets.length === 0 && cols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>No data loaded</p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Select a sheet from the sidebar</p>
      </div>
    );
  }

  if (widgets.length === 0 && cols.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>No widgets yet</p>
        <button onClick={onAddWidget} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>+ Add Widget</button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={80}
        margin={[12, 12]}
        width={width}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {widgets.map(widget => (
          <div
            key={widget.id}
            className="rounded-xl border overflow-hidden flex flex-col"
            style={{ background: widget.config.bgColor || 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            {/* Widget header */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              {editMode && (
                <span className="drag-handle cursor-grab active:cursor-grabbing select-none text-base leading-none" style={{ color: 'var(--color-text-muted)' }} title="Drag to reposition">⠿</span>
              )}
              <span className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--color-text)' }}>
                {widget.config.title ?? widget.widget_type}
              </span>
              {editMode && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingWidget(widget)}
                    title="Edit widget"
                    className="w-5 h-5 flex items-center justify-center rounded text-xs hover:opacity-80"
                    style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                  >✏️</button>
                  <button
                    onClick={() => { if (confirm('Remove this widget?')) removeWidget(widget.id); }}
                    title="Delete widget"
                    className="w-5 h-5 flex items-center justify-center rounded text-xs hover:opacity-80"
                    style={{ background: 'color-mix(in srgb, var(--color-error) 15%, transparent)', color: 'var(--color-error)' }}
                  >✕</button>
                </div>
              )}
            </div>

            {/* Widget body */}
            <div className="flex-1 overflow-hidden min-h-0">
              <WidgetBody widget={widget} rows={rows} colors={colors} />
            </div>
          </div>
        ))}
      </GridLayout>

      {/* Edit widget modal */}
      {editingWidget && (
        <Suspense fallback={null}>
          <KpiBuilderModal
            open={!!editingWidget}
            onClose={() => setEditingWidget(null)}
            existingWidget={editingWidget}
            lockSource={true}
          />
        </Suspense>
      )}
    </div>
  );
}
