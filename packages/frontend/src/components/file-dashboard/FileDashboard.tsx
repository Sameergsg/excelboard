import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { sourcesApi } from '../../lib/api';
import { useAppStore } from '../../stores/useAppStore';
import type { ColumnMeta, DataSource } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { formatNumber, aggregate } from '../../lib/utils';
import { getChartColors } from '../../lib/themes';

interface DetailedSource extends DataSource { columns: ColumnMeta[]; }

export function FileDashboard() {
  const { activeSourceId, sources } = useAppStore();
  const source = sources.find(s => s.id === activeSourceId);
  const [detail, setDetail] = useState<DetailedSource | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState('');
  const colors = getChartColors();

  async function loadSource(src: DataSource, sheet?: string) {
    setLoading(true);
    try {
      const [det, rows] = await Promise.all([
        sourcesApi.get(src.id),
        sourcesApi.getData(src.id, { pageSize: 1000, sheet: sheet || src.active_sheet }),
      ]);
      setDetail(det);
      setData(rows.data);
      setActiveSheet(sheet || src.active_sheet);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (source) loadSource(source);
  }, [activeSourceId]);

  const numericCols = useMemo(() => detail?.columns.filter(c => c.data_type === 'numeric') || [], [detail]);
  const dateCols = useMemo(() => detail?.columns.filter(c => c.data_type === 'date') || [], [detail]);
  const catCols = useMemo(() => detail?.columns.filter(c => c.data_type === 'categorical') || [], [detail]);

  const kpiCols = numericCols.slice(0, 4);

  const lineData = useMemo(() => {
    if (!dateCols[0] || !numericCols[0]) return [];
    const dateKey = dateCols[0].name;
    const valKey = numericCols[0].name;
    const grouped: Record<string, number[]> = {};
    for (const row of data) {
      const d = String(row[dateKey] || '').slice(0, 10);
      if (!d) continue;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(Number(row[valKey]) || 0);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, vals]) => ({
      date,
      [valKey]: vals.reduce((a, b) => a + b, 0),
    }));
  }, [data, dateCols, numericCols]);

  const barData = useMemo(() => {
    if (!catCols[0] || !numericCols[0]) return [];
    const catKey = catCols[0].name;
    const valKey = numericCols[0].name;
    const grouped: Record<string, number> = {};
    for (const row of data) {
      const k = String(row[catKey] || 'Unknown');
      grouped[k] = (grouped[k] || 0) + (Number(row[valKey]) || 0);
    }
    return Object.entries(grouped).sort(([,a],[,b]) => b - a).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [data, catCols, numericCols]);

  const pieData = useMemo(() => {
    if (!catCols[0]) return [];
    const catKey = catCols[0].name;
    const counts: Record<string, number> = {};
    for (const row of data) { const k = String(row[catKey] || ''); if (k) counts[k] = (counts[k] || 0) + 1; }
    return Object.entries(counts).sort(([,a],[,b]) => b-a).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [data, catCols]);

  if (!source) return (
    <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
      Select a data source to view its dashboard
    </div>
  );

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner size={36} /></div>;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{source.name}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{data.length.toLocaleString()} rows · {detail?.columns.length} columns</p>
          </div>
          <div className="flex items-center gap-2">
            {(detail?.sheet_names || source.sheet_names || []).length > 1 && (
              <div className="relative flex items-center">
                <select
                  value={activeSheet}
                  onChange={e => loadSource(source, e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text)] cursor-pointer"
                >
                  {(detail?.sheet_names || source.sheet_names).map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 pointer-events-none text-[var(--color-text-muted)]" />
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={() => loadSource(source, activeSheet)}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCols.map((col, i) => {
            const vals = data.map(r => Number(r[col.name]));
            const total = aggregate(vals.map(v => isNaN(v) ? null : v), 'sum');
            const avg = aggregate(vals.map(v => isNaN(v) ? null : v), 'avg');
            return (
              <Card key={col.name} className="text-center">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">{col.display_name}</div>
                <div className="text-2xl font-bold mb-1" style={{ color: colors[i] || 'var(--color-accent)' }}>
                  {formatNumber(total)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">avg: {formatNumber(avg)}</div>
              </Card>
            );
          })}
          <Card className="text-center">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Rows</div>
            <div className="text-2xl font-bold mb-1 text-[var(--color-accent)]">{formatNumber(data.length)}</div>
            <div className="text-xs text-[var(--color-text-muted)]">in {activeSheet}</div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lineData.length > 1 && (
            <Card>
              <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4">{numericCols[0]?.display_name} Over Time</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }} />
                  <Line type="monotone" dataKey={numericCols[0]?.name} stroke={colors[0]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {barData.length > 0 && (
            <Card>
              <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4">{numericCols[0]?.display_name} by {catCols[0]?.display_name}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }} />
                  <Bar dataKey="value" fill={colors[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {pieData.length > 0 && (
            <Card>
              <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4">{catCols[0]?.display_name} Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Data Quality */}
          {detail && (
            <Card>
              <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4">Data Quality</h3>
              <div className="space-y-2 max-h-52 overflow-auto">
                {detail.columns.map(col => (
                  <div key={col.name} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-secondary)] w-32 truncate flex-shrink-0">{col.display_name}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${100 - (col.stats.nullPct || 0)}%`, background: col.stats.nullPct > 20 ? 'var(--color-warning)' : 'var(--color-success)' }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] w-16 text-right flex-shrink-0">{(100 - (col.stats.nullPct || 0)).toFixed(0)}% filled</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Data Preview Table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-sm text-[var(--color-text)]">Data Preview <span className="text-[var(--color-text-muted)] font-normal">(first 100 rows)</span></h3>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
                <tr>
                  {detail?.columns.map(col => (
                    <th key={col.name} className="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] whitespace-nowrap border-b border-[var(--color-border)]">
                      {col.display_name}
                      <span className="ml-1 text-[var(--color-text-muted)] font-normal opacity-60">{col.data_type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                    {detail?.columns.map(col => (
                      <td key={col.name} className="px-3 py-1.5 text-[var(--color-text-secondary)] whitespace-nowrap max-w-xs truncate">
                        {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : <span className="text-[var(--color-text-muted)] italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
