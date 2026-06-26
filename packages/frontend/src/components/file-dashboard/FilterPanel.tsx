import { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { ColMeta } from '../../types';
import type { useFilters } from '../../hooks/useFilters';

type FiltersApi = ReturnType<typeof useFilters>;

interface Props {
  open: boolean;
  onClose: () => void;
  columns: ColMeta[];
  allRows: Record<string, unknown>[];
  filtersApi: FiltersApi;
}

export function FilterPanel({ open, onClose, columns, allRows, filtersApi }: Props) {
  const { globalSearch, setGlobalSearch, slicers, toggleSlicer, ranges, setRange, dates, setDateRange, clearAll, activeFilters } = filtersApi;

  if (!open) return null;

  const catCols = columns.filter(c => c.data_type === 'categorical');
  const numCols = columns.filter(c => c.data_type === 'numeric');
  const dateCols = columns.filter(c => c.data_type === 'date');

  const uniqueVals: Record<string, string[]> = {};
  for (const col of catCols) {
    const vals = new Set<string>();
    for (const row of allRows) {
      const v = String(row[col.name] ?? '');
      if (v) vals.add(v);
    }
    uniqueVals[col.name] = Array.from(vals).sort().slice(0, 100);
  }

  const numBounds: Record<string, [number, number]> = {};
  for (const col of numCols) {
    const vals = allRows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    if (vals.length) numBounds[col.name] = [Math.min(...vals), Math.max(...vals)];
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <aside className="fixed right-0 top-14 bottom-0 z-40 w-80 flex flex-col border-l shadow-2xl"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>

        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            Filters {activeFilters.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--color-accent)', color: 'white' }}>
                {activeFilters.length}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <button onClick={clearAll} className="text-xs px-2 py-1 rounded-md"
                style={{ color: 'var(--color-error)', background: 'color-mix(in srgb, var(--color-error) 10%, transparent)' }}>
                Clear All
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--color-bg-secondary)]"
              style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}>Search All Columns</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }} />
              <input
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-7 pr-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              {globalSearch && (
                <button onClick={() => setGlobalSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {catCols.map(col => (
            <SlicerSection
              key={col.name}
              label={col.display_name}
              values={uniqueVals[col.name] || []}
              selected={slicers[col.name] || []}
              onToggle={v => toggleSlicer(col.name, v)}
            />
          ))}

          {numCols.map(col => {
            const bounds = numBounds[col.name];
            if (!bounds) return null;
            const current = ranges[col.name] || bounds;
            return (
              <div key={col.name}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}>{col.display_name}</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={current[0]}
                    onChange={e => setRange(col.name, [Number(e.target.value), current[1]])}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <span style={{ color: 'var(--color-text-muted)' }} className="text-xs flex-shrink-0">to</span>
                  <input type="number" value={current[1]}
                    onChange={e => setRange(col.name, [current[0], Number(e.target.value)])}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
              </div>
            );
          })}

          {dateCols.map(col => {
            const current = dates[col.name] || ['', ''];
            return (
              <div key={col.name}>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2"
                  style={{ color: 'var(--color-text-muted)' }}>{col.display_name}</label>
                <div className="space-y-1.5">
                  <input type="date" value={current[0]}
                    onChange={e => setDateRange(col.name, [e.target.value, current[1]])}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <input type="date" value={current[1]}
                    onChange={e => setDateRange(col.name, [current[0], e.target.value])}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

function SlicerSection({ label, values, selected, onToggle }: {
  label: string; values: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState('');
  const filtered = search ? values.filter(v => v.toLowerCase().includes(search.toLowerCase())) : values;

  return (
    <div>
      <button onClick={() => setExpanded(e => !e)} className="flex items-center justify-between w-full mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        {expanded ? <ChevronUp size={12} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />}
      </button>
      {expanded && (
        <>
          {values.length > 8 && (
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search values..."
              className="w-full px-2 py-1 rounded-md border text-xs mb-2 outline-none"
              style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          )}
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {filtered.map(val => {
              const active = selected.includes(val);
              return (
                <button key={val} onClick={() => onToggle(val)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                  style={active
                    ? { background: 'var(--color-accent)', color: 'white', borderColor: 'var(--color-accent)' }
                    : { background: 'transparent', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
                  }>
                  {val}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
