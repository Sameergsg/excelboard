import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Widget, WidgetType, WidgetConfig, DataSource, ColumnMeta } from '../../types';
import { sourcesApi } from '../../lib/api';

const WIDGET_TYPES: { id: WidgetType; label: string; emoji: string }[] = [
  { id: 'kpi', label: 'KPI Card', emoji: '🔢' },
  { id: 'line', label: 'Line Chart', emoji: '📈' },
  { id: 'bar', label: 'Bar Chart', emoji: '📊' },
  { id: 'area', label: 'Area Chart', emoji: '🏔️' },
  { id: 'pie', label: 'Pie / Donut', emoji: '🥧' },
  { id: 'scatter', label: 'Scatter Plot', emoji: '✦' },
  { id: 'table', label: 'Data Table', emoji: '📋' },
  { id: 'metric-comparison', label: 'Metric Comparison', emoji: '⚖️' },
  { id: 'gauge', label: 'Gauge', emoji: '⏱️' },
  { id: 'text', label: 'Text / Note', emoji: '📝' },
  { id: 'spacer', label: 'Spacer', emoji: '⬜' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (type: WidgetType, config: WidgetConfig, sourceId?: string) => void;
  sources: DataSource[];
  existing?: Widget;
  hideSourseSelector?: boolean;
}

export function WidgetConfigModal({ open, onClose, onSave, sources, existing, hideSourseSelector }: Props) {
  const [step, setStep] = useState<'type' | 'config'>(existing ? 'config' : 'type');
  const [widgetType, setWidgetType] = useState<WidgetType>(existing?.widget_type || 'kpi');
  const [sourceId, setSourceId] = useState(existing?.source_id || '');
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [config, setConfig] = useState<WidgetConfig>(existing?.config || {});

  useEffect(() => {
    if (existing) { setWidgetType(existing.widget_type); setSourceId(existing.source_id || ''); setConfig(existing.config); }
  }, [existing]);

  // When hideSourseSelector is true, auto-load columns from the single source
  useEffect(() => {
    if (hideSourseSelector && sources.length === 1 && !sourceId) {
      setSourceId(sources[0].id);
    }
  }, [hideSourseSelector, sources, sourceId]);

  useEffect(() => {
    if (sourceId) {
      sourcesApi.get(sourceId).then(s => setColumns(s.columns || []));
    }
  }, [sourceId]);

  function upd(partial: Partial<WidgetConfig>) { setConfig(c => ({ ...c, ...partial })); }

  function handleSave() {
    onSave(widgetType, config, sourceId || undefined);
    onClose();
    if (!existing) { setStep('type'); setWidgetType('kpi'); setSourceId(''); setConfig({}); }
  }

  const numCols = columns.filter(c => c.data_type === 'numeric');
  const allCols = columns;

  function ColSelect({ label, val, onChange, cols = allCols, multi = false }: { label: string; val: string | string[] | undefined; onChange: (v: string | string[]) => void; cols?: ColumnMeta[]; multi?: boolean }) {
    return (
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
        {multi ? (
          <select multiple value={(val as string[]) || []} onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))}
            className="w-full px-2 py-1.5 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] h-24">
            {cols.map(c => <option key={c.name} value={c.name}>{c.display_name} ({c.data_type})</option>)}
          </select>
        ) : (
          <select value={(val as string) || ''} onChange={e => onChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)]">
            <option value="">Select column...</option>
            {cols.map(c => <option key={c.name} value={c.name}>{c.display_name} ({c.data_type})</option>)}
          </select>
        )}
      </div>
    );
  }

  function Input({ label, val, onChange, type = 'text', ph = '' }: { label: string; val: string | number | undefined; onChange: (v: string) => void; type?: string; ph?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</label>
        <input type={type} value={val ?? ''} onChange={e => onChange(e.target.value)} placeholder={ph}
          className="w-full px-2 py-1.5 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
      </div>
    );
  }

  function Toggle({ label, val, onChange }: { label: string; val: boolean | undefined; onChange: (v: boolean) => void }) {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!val} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-[var(--color-accent)]" />
        <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      </label>
    );
  }

  function AggSelect({ val, onChange }: { val: string | undefined; onChange: (v: string) => void }) {
    return (
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Aggregation</label>
        <select value={val || 'sum'} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)]">
          {['sum','avg','count','min','max'].map(a => <option key={a}>{a}</option>)}
        </select>
      </div>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit Widget' : 'Add Widget'} size="lg">
      {step === 'type' && (
        <div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">Choose a widget type:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {WIDGET_TYPES.map(wt => (
              <button key={wt.id}
                onClick={() => { setWidgetType(wt.id); setStep('config'); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
                <span className="text-2xl">{wt.emoji}</span>
                <span className="text-xs font-medium text-[var(--color-text)]">{wt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'config' && (
        <div className="space-y-4">
          {!existing && <button onClick={() => setStep('type')} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">← Change type</button>}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{WIDGET_TYPES.find(w => w.id === widgetType)?.emoji}</span>
            <span className="font-semibold text-[var(--color-text)]">{WIDGET_TYPES.find(w => w.id === widgetType)?.label}</span>
          </div>

          <Input label="Widget Title" val={config.title} onChange={v => upd({ title: v })} ph="My KPI" />

          {widgetType !== 'text' && widgetType !== 'spacer' && !hideSourseSelector && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Data Source</label>
              <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)]">
                <option value="">Select a data source...</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {widgetType === 'text' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Content</label>
              <textarea value={config.content || ''} onChange={e => upd({ content: e.target.value })} rows={5}
                className="w-full px-2 py-1.5 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none resize-none" />
            </div>
          )}

          {widgetType === 'kpi' && sourceId && (
            <div className="grid grid-cols-2 gap-3">
              <ColSelect label="Column" val={config.column} onChange={v => upd({ column: v as string })} cols={numCols} />
              <AggSelect val={config.aggregation} onChange={v => upd({ aggregation: v as WidgetConfig['aggregation'] })} />
              <Input label="Label" val={config.label} onChange={v => upd({ label: v })} />
              <Input label="Prefix (e.g. $)" val={config.prefix} onChange={v => upd({ prefix: v })} />
              <Input label="Suffix (e.g. %)" val={config.suffix} onChange={v => upd({ suffix: v })} />
            </div>
          )}

          {(widgetType === 'line' || widgetType === 'bar' || widgetType === 'area') && sourceId && (
            <div className="grid grid-cols-2 gap-3">
              <ColSelect label="X Axis" val={config.xAxis} onChange={v => upd({ xAxis: v as string })} />
              <ColSelect label="Y Axis (hold Ctrl for multi)" val={config.yAxis} onChange={v => upd({ yAxis: v as string[] })} cols={numCols} multi />
              <AggSelect val={config.aggregation} onChange={v => upd({ aggregation: v as WidgetConfig['aggregation'] })} />
              <div className="flex flex-col gap-2">
                <Toggle label="Smooth curves" val={config.smooth} onChange={v => upd({ smooth: v })} />
                <Toggle label="Stacked" val={config.stacked} onChange={v => upd({ stacked: v })} />
                <Toggle label="Show Legend" val={config.showLegend} onChange={v => upd({ showLegend: v })} />
                {widgetType === 'bar' && <Toggle label="Horizontal" val={config.horizontal} onChange={v => upd({ horizontal: v })} />}
              </div>
            </div>
          )}

          {widgetType === 'pie' && sourceId && (
            <div className="grid grid-cols-2 gap-3">
              <ColSelect label="Category Column" val={config.categoryColumn} onChange={v => upd({ categoryColumn: v as string })} />
              <ColSelect label="Value Column" val={config.valueColumn} onChange={v => upd({ valueColumn: v as string })} cols={numCols} />
              <Input label="Max Slices" val={config.maxSlices} onChange={v => upd({ maxSlices: Number(v) })} type="number" ph="8" />
              <Toggle label="Show Legend" val={config.showLegend} onChange={v => upd({ showLegend: v })} />
            </div>
          )}

          {widgetType === 'scatter' && sourceId && (
            <div className="grid grid-cols-2 gap-3">
              <ColSelect label="X Column" val={config.xColumn} onChange={v => upd({ xColumn: v as string })} cols={numCols} />
              <ColSelect label="Y Column" val={config.yColumn} onChange={v => upd({ yColumn: v as string })} cols={numCols} />
            </div>
          )}

          {widgetType === 'table' && sourceId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <ColSelect label="Columns (hold Ctrl for multi)" val={config.columns} onChange={v => upd({ columns: v as string[] })} multi />
              </div>
              <Input label="Rows per page" val={config.pageSize} onChange={v => upd({ pageSize: Number(v) })} type="number" ph="50" />
              <Toggle label="Searchable" val={config.searchable} onChange={v => upd({ searchable: v })} />
            </div>
          )}

          {widgetType === 'metric-comparison' && sourceId && (
            <div className="grid grid-cols-2 gap-3">
              <ColSelect label="Metric 1" val={config.column} onChange={v => upd({ column: v as string })} cols={numCols} />
              <ColSelect label="Metric 2" val={config.column2} onChange={v => upd({ column2: v as string })} cols={numCols} />
              <AggSelect val={config.aggregation} onChange={v => upd({ aggregation: v as WidgetConfig['aggregation'] })} />
            </div>
          )}

          {widgetType === 'gauge' && sourceId && (
            <div className="grid grid-cols-2 gap-3">
              <ColSelect label="Column" val={config.column} onChange={v => upd({ column: v as string })} cols={numCols} />
              <AggSelect val={config.aggregation} onChange={v => upd({ aggregation: v as WidgetConfig['aggregation'] })} />
              <Input label="Min" val={config.minVal} onChange={v => upd({ minVal: Number(v) })} type="number" />
              <Input label="Max" val={config.maxVal} onChange={v => upd({ maxVal: Number(v) })} type="number" />
              <Input label="Target" val={config.target} onChange={v => upd({ target: Number(v) })} type="number" />
              <Input label="Label" val={config.label} onChange={v => upd({ label: v })} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>
              {existing ? 'Save Changes' : 'Add Widget'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
