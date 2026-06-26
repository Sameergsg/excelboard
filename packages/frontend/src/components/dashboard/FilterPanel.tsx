import { useState } from 'react';
import { X, SlidersHorizontal, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { ColMeta } from '../../types';
import type { useFilters } from '../../hooks/useFilters';

type Row = Record<string, unknown>;

interface Props {
  open: boolean;
  onClose: () => void;
  cols: ColMeta[];
  allRows: Row[];
  filtersApi: ReturnType<typeof useFilters>;
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-[var(--color-bg-secondary)] transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {title}
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function FilterPanel({ open, onClose, cols, allRows, filtersApi }: Props) {
  const {
    globalSearch, setGlobalSearch,
    slicers, toggleSlicer,
    ranges, setRange,
    dates, setDateRange,
    activeFilters, clearAll,
  } = filtersApi;

  const [slicerSearches, setSlicerSearches] = useState<Record<string, string>>({});

  const categoricalCols = cols.filter(c => c.data_type === 'categorical');
  const numericCols = cols.filter(c => c.data_type === 'numeric');
  const dateCols = cols.filter(c => c.data_type === 'date');

  const getUniqueValues = (colName: string): string[] => {
    const seen = new Set<string>();
    for (const row of allRows) {
      const v = String(row[colName] ?? '');
      if (v) seen.add(v);
      if (seen.size >= 50) break;
    }
    return Array.from(seen).sort();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-14 bottom-0 z-40 flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: '288px',
          background: 'var(--color-card)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Filters
            </span>
            {activeFilters.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {activeFilters.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Global search */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search all columns…"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none focus:border-[var(--color-accent)]"
                style={{
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)',
                }}
              />
            </div>
          </div>

          {/* Categorical slicers */}
          {categoricalCols.map(col => {
            const values = getUniqueValues(col.name);
            const search = slicerSearches[col.name] ?? '';
            const filtered = search ? values.filter(v => v.toLowerCase().includes(search.toLowerCase())) : values;
            const selected = slicers[col.name] ?? [];
            return (
              <CollapsibleSection key={col.name} title={col.display_name}>
                {values.length > 10 && (
                  <input
                    type="text"
                    placeholder="Search values…"
                    value={search}
                    onChange={e => setSlicerSearches(p => ({ ...p, [col.name]: e.target.value }))}
                    className="w-full px-2 py-1 mb-2 rounded text-xs border outline-none"
                    style={{
                      background: 'var(--color-bg-secondary)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)',
                    }}
                  />
                )}
                <div className="flex flex-wrap gap-1">
                  {filtered.map(v => {
                    const active = selected.includes(v);
                    return (
                      <button
                        key={v}
                        onClick={() => toggleSlicer(col.name, v)}
                        className="px-2 py-0.5 rounded-full text-xs font-medium border transition-all"
                        style={{
                          background: active ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                          color: active ? '#fff' : 'var(--color-text)',
                          borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleSection>
            );
          })}

          {/* Numeric ranges */}
          {numericCols.map(col => {
            const current = ranges[col.name];
            const minVal = col.stats.min ?? 0;
            const maxVal = col.stats.max ?? 0;
            return (
              <CollapsibleSection key={col.name} title={col.display_name}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={`Min (${minVal})`}
                    value={current?.[0] ?? ''}
                    onChange={e => setRange(col.name, [Number(e.target.value), current?.[1] ?? maxVal])}
                    className="w-full px-2 py-1 rounded text-xs border outline-none"
                    style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                  />
                  <input
                    type="number"
                    placeholder={`Max (${maxVal})`}
                    value={current?.[1] ?? ''}
                    onChange={e => setRange(col.name, [current?.[0] ?? minVal, Number(e.target.value)])}
                    className="w-full px-2 py-1 rounded text-xs border outline-none"
                    style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                  />
                </div>
              </CollapsibleSection>
            );
          })}

          {/* Date ranges */}
          {dateCols.map(col => {
            const current = dates[col.name];
            return (
              <CollapsibleSection key={col.name} title={col.display_name}>
                <div className="flex flex-col gap-1.5">
                  <div>
                    <label className="text-xs mb-0.5 block" style={{ color: 'var(--color-text-muted)' }}>From</label>
                    <input
                      type="date"
                      value={current?.[0] ?? ''}
                      onChange={e => setDateRange(col.name, [e.target.value, current?.[1] ?? ''])}
                      className="w-full px-2 py-1 rounded text-xs border outline-none"
                      style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-0.5 block" style={{ color: 'var(--color-text-muted)' }}>To</label>
                    <input
                      type="date"
                      value={current?.[1] ?? ''}
                      onChange={e => setDateRange(col.name, [current?.[0] ?? '', e.target.value])}
                      className="w-full px-2 py-1 rounded text-xs border outline-none"
                      style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            );
          })}

          {cols.length === 0 && (
            <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Load data to see filter options
            </div>
          )}
        </div>
      </div>
    </>
  );
}
