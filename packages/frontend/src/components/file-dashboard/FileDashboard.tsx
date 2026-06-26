import { useEffect, useState, useMemo, useCallback } from 'react';
import { RefreshCw, ChevronDown, Edit2, Eye, Plus, SlidersHorizontal, X, Pencil } from 'lucide-react';
import GridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { sourcesApi } from '../../lib/api';
import { useAppStore } from '../../stores/useAppStore';
import type { ColumnMeta, DataSource, Widget, WidgetType, WidgetConfig } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { formatNumber, aggregate } from '../../lib/utils';
import { getChartColors } from '../../lib/themes';
import { WidgetConfigModal } from '../builder/WidgetConfigModal';
import { FilterPanel } from './FilterPanel';
import { useFilters } from '../../hooks/useFilters';

interface DetailedSource extends DataSource { columns: ColumnMeta[]; }

interface LocalWidget {
  id: string;
  widget_type: WidgetType;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
}

function storageKey(sourceId: string, sheet: string) { return `excelboard-widgets-${sourceId}-${sheet}`; }

function buildDefaultWidgets(
  numericCols: ColumnMeta[],
  dateCols: ColumnMeta[],
  catCols: ColumnMeta[],
  colors: string[],
): LocalWidget[] {
  const widgets: LocalWidget[] = [];
  let y = 0;

  // KPI cards
  const kpiCols = numericCols.slice(0, 4);
  kpiCols.forEach((col, i) => {
    widgets.push({
      id: `kpi-${col.name}`,
      widget_type: 'kpi',
      config: { column: col.name, aggregation: 'sum', label: col.display_name },
      position: { x: i * 3, y, w: 3, h: 2 },
    });
  });
  // Total rows widget
  widgets.push({
    id: 'kpi-total-rows',
    widget_type: 'text',
    config: { title: 'Total Rows', content: '' },
    position: { x: kpiCols.length * 3, y, w: 3, h: 2 },
  });
  y += 2;

  // Line chart if date col exists
  if (dateCols[0] && numericCols[0]) {
    widgets.push({
      id: `line-${numericCols[0].name}`,
      widget_type: 'line',
      config: {
        title: `${numericCols[0].display_name} Over Time`,
        xAxis: dateCols[0].name,
        yAxis: [numericCols[0].name],
        smooth: true,
        aggregation: 'sum',
      },
      position: { x: 0, y, w: 6, h: 4 },
    });
  }

  // Bar chart if cat col exists
  if (catCols[0] && numericCols[0]) {
    widgets.push({
      id: `bar-${catCols[0].name}`,
      widget_type: 'bar',
      config: {
        title: `${numericCols[0].display_name} by ${catCols[0].display_name}`,
        xAxis: catCols[0].name,
        yAxis: [numericCols[0].name],
        horizontal: true,
        aggregation: 'sum',
      },
      position: { x: 6, y, w: 6, h: 4 },
    });
  }
  y += 4;

  // Pie chart
  if (catCols[0]) {
    widgets.push({
      id: `pie-${catCols[0].name}`,
      widget_type: 'pie',
      config: {
        title: `${catCols[0].display_name} Distribution`,
        categoryColumn: catCols[0].name,
        valueColumn: numericCols[0]?.name,
        maxSlices: 8,
        showLegend: true,
      },
      position: { x: 0, y, w: 6, h: 4 },
    });
  }

  return widgets;
}

export function FileDashboard() {
  const { activeSourceId, sources } = useAppStore();
  const source = sources.find(s => s.id === activeSourceId);
  const [detail, setDetail] = useState<DetailedSource | null>(null);
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [widgets, setWidgets] = useState<LocalWidget[]>([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<LocalWidget | null>(null);
  const [containerWidth, setContainerWidth] = useState(1100);
  const colors = getChartColors();

  const numericCols = useMemo(() => detail?.columns.filter(c => c.data_type === 'numeric') || [], [detail]);
  const dateCols = useMemo(() => detail?.columns.filter(c => c.data_type === 'date') || [], [detail]);
  const catCols = useMemo(() => detail?.columns.filter(c => c.data_type === 'categorical') || [], [detail]);

  const filtersApi = useFilters(detail?.columns || []);
  const filteredRows = useMemo(() => filtersApi.filterRows(allRows), [filtersApi.filterRows, allRows, filtersApi.isFiltered]);

  useEffect(() => {
    const el = document.getElementById('file-dashboard-grid');
    if (el) setContainerWidth(el.clientWidth - 32);
  });

  async function loadSource(src: DataSource, sheet?: string) {
    setLoading(true);
    const targetSheet = sheet || src.active_sheet;
    try {
      // Fetch base info, row data, AND per-sheet column analysis in parallel
      const [det, rows, sheetStats] = await Promise.all([
        sourcesApi.get(src.id),
        sourcesApi.getData(src.id, { pageSize: 999999, sheet: targetSheet }),
        sourcesApi.getStats(src.id, targetSheet),   // fresh column types for THIS sheet
      ]);

      // Override columns with sheet-specific analysis (fixes multi-sheet column mismatch)
      const detWithCorrectCols = { ...det, columns: sheetStats.columns };
      setDetail(detWithCorrectCols);
      setAllRows(rows.data);
      setActiveSheet(targetSheet);

      // Each sheet gets its own saved layout
      const saved = localStorage.getItem(storageKey(src.id, targetSheet));
      if (saved) {
        setWidgets(JSON.parse(saved));
      } else {
        const numC = sheetStats.columns.filter((c: ColumnMeta) => c.data_type === 'numeric');
        const dateC = sheetStats.columns.filter((c: ColumnMeta) => c.data_type === 'date');
        const catC = sheetStats.columns.filter((c: ColumnMeta) => c.data_type === 'categorical');
        setWidgets(buildDefaultWidgets(numC, dateC, catC, colors));
      }
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (source) loadSource(source);
    setEditMode(false);
    setShowFilters(false);
    filtersApi.clearAll();
  }, [activeSourceId]);

  // Persist widgets to localStorage — keyed by source+sheet so each sheet has its own layout
  const saveWidgets = useCallback((ws: LocalWidget[]) => {
    if (source && activeSheet) localStorage.setItem(storageKey(source.id, activeSheet), JSON.stringify(ws));
  }, [source, activeSheet]);

  function handleLayoutChange(newLayout: Layout[]) {
    if (!editMode) return;
    setWidgets(prev => {
      const updated = prev.map(w => {
        const l = newLayout.find(l => l.i === w.id);
        return l ? { ...w, position: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
      });
      saveWidgets(updated);
      return updated;
    });
  }

  function handleAddWidget(type: WidgetType, config: WidgetConfig) {
    const maxY = widgets.reduce((m, w) => Math.max(m, w.position.y + w.position.h), 0);
    const id = `widget-${Date.now()}`;
    const newWidget: LocalWidget = { id, widget_type: type, config, position: { x: 0, y: maxY, w: 4, h: 3 } };
    const updated = [...widgets, newWidget];
    setWidgets(updated);
    saveWidgets(updated);
  }

  function handleEditWidget(type: WidgetType, config: WidgetConfig) {
    if (!editingWidget) return;
    const updated = widgets.map(w => w.id === editingWidget.id ? { ...w, widget_type: type, config } : w);
    setWidgets(updated);
    saveWidgets(updated);
    setEditingWidget(null);
  }

  function handleDeleteWidget(id: string) {
    const updated = widgets.filter(w => w.id !== id);
    setWidgets(updated);
    saveWidgets(updated);
  }

  function resetLayout() {
    if (!detail) return;
    const defaults = buildDefaultWidgets(numericCols, dateCols, catCols, colors);
    setWidgets(defaults);
    saveWidgets(defaults);
  }

  if (!source) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
      Select a data source to view its dashboard
    </div>
  );

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner size={36} /></div>;

  const isFiltered = filtersApi.isFiltered;
  const sheetNames = detail?.sheet_names || source.sheet_names || [];

  // Build widget objects compatible with WidgetRenderer (which expects a Widget with source_id)
  const gridLayout: Layout[] = widgets.map(w => ({
    i: w.id, x: w.position.x, y: w.position.y, w: w.position.w, h: w.position.h, minW: 2, minH: 2,
  }));

  // Inject filtered data into widgets via a wrapper
  const widgetAsWidget = (w: LocalWidget): Widget => ({
    id: w.id,
    dashboard_id: '',
    widget_type: w.widget_type,
    source_id: source.id,
    config: { ...w.config, _filteredData: filteredRows } as WidgetConfig,
    position: w.position,
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {source.name}
              {sheetNames.length > 1 && (
                <span className="ml-2 text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
                  · {activeSheet}
                </span>
              )}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {isFiltered
                ? <><span style={{ color: 'var(--color-accent)' }}>{filteredRows.length.toLocaleString()}</span> of {allRows.length.toLocaleString()} rows (filtered)</>
                : <>{allRows.length.toLocaleString()} rows · {detail?.columns.length} columns · all data loaded</>
              }
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {sheetNames.length > 1 && (
              <div className="relative flex items-center">
                <select value={activeSheet} onChange={e => loadSource(source, e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-sm cursor-pointer"
                  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  {sheetNames.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            )}

            <Button variant="secondary" size="sm" onClick={() => loadSource(source, activeSheet)}>
              <RefreshCw size={13} /> Refresh
            </Button>

            <Button
              variant={showFilters ? 'primary' : 'secondary'} size="sm"
              onClick={() => setShowFilters(f => !f)}>
              <SlidersHorizontal size={13} />
              Filters
              {filtersApi.activeFilters.length > 0 && (
                <span className="ml-0.5 px-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'white', color: 'var(--color-accent)' }}>
                  {filtersApi.activeFilters.length}
                </span>
              )}
            </Button>

            <Button variant={editMode ? 'primary' : 'secondary'} size="sm"
              onClick={() => setEditMode(e => !e)}>
              {editMode ? <><Eye size={13} /> Done</> : <><Edit2 size={13} /> Edit</>}
            </Button>

            {editMode && (
              <>
                <Button size="sm" onClick={() => setShowAddWidget(true)}>
                  <Plus size={13} /> Widget
                </Button>
                <Button size="sm" variant="ghost" onClick={resetLayout}
                  style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                  Reset Layout
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Active filter badges */}
        {filtersApi.activeFilters.length > 0 && (
          <div className="flex items-center gap-2 px-6 py-2 flex-wrap border-b"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Active:</span>
            {filtersApi.activeFilters.map((f, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                {f.label}
                <button onClick={() => filtersApi.removeFilter(f.key)}>
                  <X size={10} />
                </button>
              </span>
            ))}
            <button onClick={filtersApi.clearAll}
              className="text-xs ml-1" style={{ color: 'var(--color-error)' }}>
              Clear All
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4" id="file-dashboard-grid">
          {filteredRows.length === 0 && isFiltered ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No data matches your filters</p>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Try adjusting or removing some filters</p>
              <Button variant="secondary" size="sm" onClick={filtersApi.clearAll}>Clear All Filters</Button>
            </div>
          ) : widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No widgets yet</p>
              <Button size="sm" onClick={() => { setEditMode(true); setShowAddWidget(true); }}>
                <Plus size={14} /> Add Widget
              </Button>
            </div>
          ) : (
            <GridLayout
              layout={gridLayout}
              cols={12}
              rowHeight={60}
              width={containerWidth}
              isDraggable={editMode}
              isResizable={editMode}
              onLayoutChange={handleLayoutChange}
              margin={[12, 12]}
            >
              {widgets.map(w => {
                // Special case: total rows text widget
                const isRowsWidget = w.id === 'kpi-total-rows';
                return (
                  <div key={w.id} className="relative group">
                    <Card className="h-full flex flex-col overflow-hidden p-3">
                      {w.config.title && !isRowsWidget && (
                        <p className="text-xs font-semibold mb-2 truncate flex-shrink-0"
                          style={{ color: 'var(--color-text-secondary)' }}>{w.config.title}</p>
                      )}
                      <div className="flex-1 min-h-0">
                        {isRowsWidget ? (
                          <div className="flex flex-col justify-center h-full px-2">
                            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Total Rows</p>
                            <div className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
                              {formatNumber(filteredRows.length)}
                            </div>
                            {isFiltered && (
                              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                of {formatNumber(allRows.length)} total
                              </p>
                            )}
                          </div>
                        ) : (
                          <FileDashboardWidgetRenderer
                            widget={w}
                            sourceId={source.id}
                            filteredRows={filteredRows}
                            allRows={allRows}
                          />
                        )}
                      </div>
                    </Card>
                    {editMode && (
                      <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1 z-10">
                        <button onClick={() => setEditingWidget(w)}
                          className="p-1 rounded border"
                          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDeleteWidget(w.id)}
                          className="p-1 rounded border"
                          style={{ background: 'color-mix(in srgb, var(--color-error) 15%, transparent)', borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
                          <X size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </GridLayout>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        columns={detail?.columns || []}
        allRows={allRows}
        filtersApi={filtersApi}
      />

      {/* Add Widget Modal */}
      <WidgetConfigModal
        open={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        onSave={(type, config) => handleAddWidget(type, config)}
        sources={sources}
        hideSourseSelector
      />

      {/* Edit Widget Modal */}
      {editingWidget && (
        <WidgetConfigModal
          open={!!editingWidget}
          onClose={() => setEditingWidget(null)}
          onSave={(type, config) => handleEditWidget(type, config)}
          sources={sources}
          existing={editingWidget as unknown as Widget}
          hideSourseSelector
        />
      )}
    </div>
  );
}

// Widget renderer that passes filtered data directly (avoids re-fetch)
function FileDashboardWidgetRenderer({
  widget, sourceId, filteredRows, allRows,
}: {
  widget: LocalWidget;
  sourceId: string;
  filteredRows: Record<string, unknown>[];
  allRows: Record<string, unknown>[];
}) {
  const fullWidget: Widget = {
    id: widget.id,
    dashboard_id: '',
    widget_type: widget.widget_type,
    source_id: sourceId,
    config: widget.config,
    position: widget.position,
  };

  // For file dashboard widgets, compute values directly from filteredRows
  return <InlineWidgetRenderer widget={fullWidget} rows={filteredRows} allRows={allRows} />;
}

// Inline computations instead of re-fetching API
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const TOOLTIP_STYLE = { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontSize: 12 };
const AXIS_STYLE = { fontSize: 11, fill: 'var(--color-text-muted)' };

function InlineWidgetRenderer({ widget, rows, allRows: _ }: { widget: Widget; rows: Record<string, unknown>[]; allRows: Record<string, unknown>[] }) {
  const { config, widget_type } = widget;
  const colors = getChartColors();

  if (rows.length === 0) {
    return <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-text-muted)' }}>No data</div>;
  }

  if (widget_type === 'kpi') {
    const vals = rows.map(r => Number(r[config.column || ''])).filter(v => !isNaN(v));
    const value = aggregate(vals.map(v => isNaN(v) ? null : v), config.aggregation || 'sum');
    return (
      <div className="flex flex-col justify-center h-full px-2">
        <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{config.label || config.column}</p>
        <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          {config.prefix}{formatNumber(value)}{config.suffix}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {(value ?? 0) >= 0 ? <TrendingUp size={14} style={{ color: 'var(--color-success)' }} /> : <TrendingDown size={14} style={{ color: 'var(--color-error)' }} />}
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{config.aggregation || 'sum'}</span>
        </div>
      </div>
    );
  }

  if (widget_type === 'text') {
    return <div className="h-full overflow-auto p-1 text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{config.content || ''}</div>;
  }

  if (widget_type === 'table') {
    const cols = config.columns?.length ? config.columns : Object.keys(rows[0] || {});
    const [search, setSearch] = useState('');
    const displayed = search ? rows.filter(r => cols.some((c: string) => String(r[c] ?? '').toLowerCase().includes(search.toLowerCase()))) : rows;
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {config.searchable && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="mx-1 mt-1 px-2 py-1 text-xs rounded border outline-none"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
        )}
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: 'var(--color-bg-secondary)' }}>
              <tr>{cols.map((c: string) => <th key={c} className="px-2 py-1.5 text-left font-medium whitespace-nowrap border-b" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {displayed.slice(0, config.pageSize || 50).map((row, i) => (
                <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  {cols.map((c: string) => <td key={c} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{String(row[c] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (widget_type === 'metric-comparison') {
    const v1 = aggregate(rows.map(r => { const n = Number(r[config.column || '']); return isNaN(n) ? null : n; }), config.aggregation || 'sum');
    const v2 = aggregate(rows.map(r => { const n = Number(r[config.column2 || '']); return isNaN(n) ? null : n; }), config.aggregation2 || 'sum');
    const pct = v1 && v2 && v1 !== 0 ? ((v2 - v1) / Math.abs(v1)) * 100 : null;
    return (
      <div className="flex items-center justify-around h-full px-2">
        <div className="text-center"><p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{config.label || config.column}</p><p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{formatNumber(v1)}</p></div>
        <div className="flex flex-col items-center">
          {pct !== null ? (<><span className="text-lg">{pct > 0 ? '↑' : '↓'}</span><span className="text-xs font-medium" style={{ color: pct > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span></>) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
        </div>
        <div className="text-center"><p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{config.column2}</p><p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{formatNumber(v2)}</p></div>
      </div>
    );
  }

  if (widget_type === 'gauge') {
    const vals = rows.map(r => { const n = Number(r[config.column || '']); return isNaN(n) ? null : n; });
    const value = aggregate(vals, config.aggregation || 'sum') || 0;
    const min = config.minVal || 0, max = config.maxVal || 100;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const color = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
    const r2 = 52, cx = 70, cy = 70;
    const circ = Math.PI * r2;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <svg width={140} height={80} viewBox="0 0 140 80">
          <path d={`M ${cx-r2} ${cy} A ${r2} ${r2} 0 0 1 ${cx+r2} ${cy}`} fill="none" stroke="var(--color-bg-secondary)" strokeWidth={14} />
          <path d={`M ${cx-r2} ${cy} A ${r2} ${r2} 0 0 1 ${cx+r2} ${cy}`} fill="none" stroke={color} strokeWidth={14} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
        </svg>
        <div className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{config.label || config.column}</div>
      </div>
    );
  }

  // Chart widgets
  const xKey = config.xAxis || config.categoryColumn || '';
  const yKeys = config.yAxis?.length ? config.yAxis : (config.valueColumn ? [config.valueColumn] : []);

  if (widget_type === 'pie') {
    const grouped: Record<string, number> = {};
    for (const row of rows) {
      const k = String(row[xKey] || row[config.categoryColumn || ''] || 'Unknown');
      const v = Number(row[config.valueColumn || yKeys[0] || '']) || 1;
      grouped[k] = (grouped[k] || 0) + v;
    }
    const pieData = Object.entries(grouped).sort(([, a], [, b]) => b - a).slice(0, config.maxSlices || 8)
      .map(([name, value]) => ({ name, value }));
    return (
      <div className="h-full" style={{ minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" innerRadius="35%">
              {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {config.showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (widget_type === 'scatter') {
    const scatterData = rows.map(row => ({ x: Number(row[config.xColumn || '']), y: Number(row[config.yColumn || '']) })).filter(p => !isNaN(p.x) && !isNaN(p.y));
    return (
      <div className="h-full" style={{ minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="x" type="number" tick={AXIS_STYLE} />
            <YAxis dataKey="y" type="number" tick={AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Scatter data={scatterData} fill={colors[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Line, Bar, Area
  if (!xKey || yKeys.length === 0) {
    return <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--color-text-muted)' }}>Configure X and Y axes</div>;
  }

  const grouped: Record<string, Record<string, number[]>> = {};
  for (const row of rows) {
    const k = String(row[xKey] || '');
    if (!k) continue;
    if (!grouped[k]) grouped[k] = {};
    for (const y of yKeys) {
      if (!grouped[k][y]) grouped[k][y] = [];
      const n = Number(row[y]);
      if (!isNaN(n)) grouped[k][y].push(n);
    }
  }
  const chartData = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([key, vals]) => {
    const point: Record<string, unknown> = { [xKey]: key };
    for (const y of yKeys) point[y] = aggregate((vals[y] || []).map(v => isNaN(v) ? null : v), config.aggregation || 'sum');
    return point;
  });

  const commonProps = { data: chartData, margin: { top: 4, right: 8, bottom: 4, left: 8 } };
  function axes() {
    return <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
      <XAxis dataKey={xKey} tick={AXIS_STYLE} />
      <YAxis tick={AXIS_STYLE} />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {config.showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
    </>;
  }

  return (
    <div className="h-full" style={{ minHeight: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        {widget_type === 'line' ? (
          <LineChart {...commonProps}>{axes()}{yKeys.map((y: string, i: number) => <Line key={y} type={config.smooth ? 'monotone' : 'linear'} dataKey={y} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />)}</LineChart>
        ) : widget_type === 'area' ? (
          <AreaChart {...commonProps}>{axes()}{yKeys.map((y: string, i: number) => <Area key={y} type="monotone" dataKey={y} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} strokeWidth={2} />)}</AreaChart>
        ) : (
          <BarChart {...commonProps} layout={config.horizontal ? 'vertical' : 'horizontal'}>
            {config.horizontal
              ? <><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis type="number" tick={AXIS_STYLE} /><YAxis type="category" dataKey={xKey} tick={AXIS_STYLE} width={80} /><Tooltip contentStyle={TOOLTIP_STYLE} /></>
              : axes()
            }
            {yKeys.map((y: string, i: number) => <Bar key={y} dataKey={y} fill={colors[i % colors.length]} stackId={config.stacked ? 'stack' : undefined} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
