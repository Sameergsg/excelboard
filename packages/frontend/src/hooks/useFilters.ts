import { useState, useCallback, useMemo } from 'react';
import type { ColumnMeta } from '../types';

export interface ActiveFilter {
  column: string;
  type: 'search' | 'slicer' | 'range' | 'date';
  value: string | string[] | [number, number] | [string, string];
  label: string;
}

export interface FilterState {
  globalSearch: string;
  slicers: Record<string, string[]>;      // col -> selected values
  ranges: Record<string, [number, number]>; // col -> [min, max]
  dates: Record<string, [string, string]>;  // col -> [from, to]
}

const EMPTY: FilterState = { globalSearch: '', slicers: {}, ranges: {}, dates: {} };

export function useFilters(columns: ColumnMeta[]) {
  const [filters, setFilters] = useState<FilterState>(EMPTY);

  const setGlobalSearch = useCallback((v: string) => setFilters(f => ({ ...f, globalSearch: v })), []);

  const toggleSlicerValue = useCallback((col: string, val: string) => {
    setFilters(f => {
      const current = f.slicers[col] || [];
      const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
      return { ...f, slicers: { ...f.slicers, [col]: next } };
    });
  }, []);

  const clearSlicer = useCallback((col: string) => {
    setFilters(f => { const s = { ...f.slicers }; delete s[col]; return { ...f, slicers: s }; });
  }, []);

  const setRange = useCallback((col: string, range: [number, number]) => {
    setFilters(f => ({ ...f, ranges: { ...f.ranges, [col]: range } }));
  }, []);

  const clearRange = useCallback((col: string) => {
    setFilters(f => { const r = { ...f.ranges }; delete r[col]; return { ...f, ranges: r }; });
  }, []);

  const setDateRange = useCallback((col: string, range: [string, string]) => {
    setFilters(f => ({ ...f, dates: { ...f.dates, [col]: range } }));
  }, []);

  const clearDateRange = useCallback((col: string) => {
    setFilters(f => { const d = { ...f.dates }; delete d[col]; return { ...f, dates: d }; });
  }, []);

  const clearAll = useCallback(() => setFilters(EMPTY), []);

  const filterRows = useCallback((rows: Record<string, unknown>[]): Record<string, unknown>[] => {
    let result = rows;

    // Global search across all columns
    if (filters.globalSearch.trim()) {
      const q = filters.globalSearch.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }

    // Slicer filters
    for (const [col, selected] of Object.entries(filters.slicers)) {
      if (selected.length > 0) {
        result = result.filter(row => selected.includes(String(row[col] ?? '')));
      }
    }

    // Range filters
    for (const [col, [min, max]] of Object.entries(filters.ranges)) {
      result = result.filter(row => {
        const v = Number(row[col]);
        return !isNaN(v) && v >= min && v <= max;
      });
    }

    // Date filters
    for (const [col, [from, to]] of Object.entries(filters.dates)) {
      const fromTs = from ? new Date(from).getTime() : -Infinity;
      const toTs = to ? new Date(to).getTime() : Infinity;
      result = result.filter(row => {
        const d = new Date(String(row[col] ?? '')).getTime();
        return !isNaN(d) && d >= fromTs && d <= toTs;
      });
    }

    return result;
  }, [filters]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const list: ActiveFilter[] = [];
    if (filters.globalSearch) list.push({ column: 'All', type: 'search', value: filters.globalSearch, label: `Search: "${filters.globalSearch}"` });
    for (const [col, vals] of Object.entries(filters.slicers)) {
      if (vals.length) list.push({ column: col, type: 'slicer', value: vals, label: `${col}: ${vals.join(', ')}` });
    }
    for (const [col, [min, max]] of Object.entries(filters.ranges)) {
      list.push({ column: col, type: 'range', value: [min, max], label: `${col}: ${min} – ${max}` });
    }
    for (const [col, [from, to]] of Object.entries(filters.dates)) {
      if (from || to) list.push({ column: col, type: 'date', value: [from, to], label: `${col}: ${from || '...'} → ${to || '...'}` });
    }
    return list;
  }, [filters]);

  const isFiltered = activeFilters.length > 0;

  // Unique values per categorical column (computed from full dataset via separate call)
  const slicerOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of columns.filter(c => c.data_type === 'categorical')) {
      map[col.name] = (col.stats.sampleValues as string[]).map(String);
    }
    return map;
  }, [columns]);

  function removeFilter(f: ActiveFilter) {
    if (f.type === 'search') setGlobalSearch('');
    else if (f.type === 'slicer') clearSlicer(f.column);
    else if (f.type === 'range') clearRange(f.column);
    else if (f.type === 'date') clearDateRange(f.column);
  }

  return {
    filters, filterRows, activeFilters, isFiltered, slicerOptions,
    setGlobalSearch, toggleSlicerValue, clearSlicer,
    setRange, clearRange, setDateRange, clearDateRange,
    clearAll, removeFilter,
  };
}
