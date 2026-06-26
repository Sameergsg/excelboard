import { useState, useCallback, useMemo } from 'react';
import type { ColMeta } from '../types';

type Row = Record<string, unknown>;

interface ActiveFilter {
  label: string;
  key: string;
}

interface UseFiltersResult {
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  slicers: Record<string, string[]>;
  toggleSlicer: (col: string, value: string) => void;
  ranges: Record<string, [number, number]>;
  setRange: (col: string, range: [number, number]) => void;
  dates: Record<string, [string, string]>;
  setDateRange: (col: string, range: [string, string]) => void;
  filterRows: (rows: Row[]) => Row[];
  activeFilters: ActiveFilter[];
  clearAll: () => void;
  removeFilter: (key: string) => void;
  isFiltered: boolean;
}

export function useFilters(cols: ColMeta[]): UseFiltersResult {
  const [globalSearch, setGlobalSearch] = useState('');
  const [slicers, setSlicers] = useState<Record<string, string[]>>({});
  const [ranges, setRanges] = useState<Record<string, [number, number]>>({});
  const [dates, setDates] = useState<Record<string, [string, string]>>({});

  const toggleSlicer = useCallback((col: string, value: string) => {
    setSlicers(prev => {
      const current = prev[col] ?? [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      if (next.length === 0) {
        const { [col]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [col]: next };
    });
  }, []);

  const setRange = useCallback((col: string, range: [number, number]) => {
    setRanges(prev => ({ ...prev, [col]: range }));
  }, []);

  const setDateRange = useCallback((col: string, range: [string, string]) => {
    setDates(prev => ({ ...prev, [col]: range }));
  }, []);

  const filterRows = useCallback((rows: Row[]): Row[] => {
    let result = rows;

    // Global search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => v != null && String(v).toLowerCase().includes(q))
      );
    }

    // Slicers
    for (const [col, vals] of Object.entries(slicers)) {
      if (vals.length === 0) continue;
      result = result.filter(row => vals.includes(String(row[col] ?? '')));
    }

    // Ranges
    for (const [col, [min, max]] of Object.entries(ranges)) {
      result = result.filter(row => {
        const n = Number(row[col]);
        return !isNaN(n) && n >= min && n <= max;
      });
    }

    // Date ranges
    for (const [col, [from, to]] of Object.entries(dates)) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      result = result.filter(row => {
        const d = new Date(String(row[col] ?? ''));
        if (isNaN(d.getTime())) return false;
        return d >= fromDate && d <= toDate;
      });
    }

    return result;
  }, [globalSearch, slicers, ranges, dates]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const out: ActiveFilter[] = [];

    if (globalSearch.trim()) {
      out.push({ label: `Search: "${globalSearch}"`, key: '__search__' });
    }

    for (const [col, vals] of Object.entries(slicers)) {
      if (vals.length === 0) continue;
      const meta = cols.find(c => c.name === col);
      const label = meta?.display_name ?? col;
      out.push({ label: `${label}: ${vals.join(', ')}`, key: `slicer__${col}` });
    }

    for (const [col, [min, max]] of Object.entries(ranges)) {
      const meta = cols.find(c => c.name === col);
      const label = meta?.display_name ?? col;
      out.push({ label: `${label}: ${min} – ${max}`, key: `range__${col}` });
    }

    for (const [col, [from, to]] of Object.entries(dates)) {
      const meta = cols.find(c => c.name === col);
      const label = meta?.display_name ?? col;
      out.push({ label: `${label}: ${from} → ${to}`, key: `date__${col}` });
    }

    return out;
  }, [globalSearch, slicers, ranges, dates, cols]);

  const clearAll = useCallback(() => {
    setGlobalSearch('');
    setSlicers({});
    setRanges({});
    setDates({});
  }, []);

  const removeFilter = useCallback((key: string) => {
    if (key === '__search__') { setGlobalSearch(''); return; }
    if (key.startsWith('slicer__')) {
      const col = key.slice('slicer__'.length);
      setSlicers(prev => { const { [col]: _, ...rest } = prev; return rest; });
      return;
    }
    if (key.startsWith('range__')) {
      const col = key.slice('range__'.length);
      setRanges(prev => { const { [col]: _, ...rest } = prev; return rest; });
      return;
    }
    if (key.startsWith('date__')) {
      const col = key.slice('date__'.length);
      setDates(prev => { const { [col]: _, ...rest } = prev; return rest; });
    }
  }, []);

  const isFiltered = activeFilters.length > 0;

  return {
    globalSearch, setGlobalSearch,
    slicers, toggleSlicer,
    ranges, setRange,
    dates, setDateRange,
    filterRows,
    activeFilters, clearAll, removeFilter, isFiltered,
  };
}
