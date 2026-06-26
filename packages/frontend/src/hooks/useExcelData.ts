import { useState, useEffect, useCallback, useMemo } from 'react';
import { sourcesApi } from '../lib/api';
import { analyzeColumns } from '../lib/columnDetect';
import type { ColMeta } from '../types';

type Row = Record<string, unknown>;

// In-memory cache
const cache = new Map<string, Row[]>();

function getCacheKey(sourceId: string, sheet: string): string {
  return `${sourceId}-${sheet}`;
}

interface UseExcelDataResult {
  rows: Row[];
  cols: ColMeta[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExcelData(
  sourceId: string | null,
  sheet: string,
): UseExcelDataResult {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    if (!sourceId) return;
    const key = getCacheKey(sourceId, sheet);
    cache.delete(key);
    setTick(t => t + 1);
  }, [sourceId, sheet]);

  useEffect(() => {
    if (!sourceId) {
      setRows([]);
      return;
    }

    const key = getCacheKey(sourceId, sheet);
    if (cache.has(key)) {
      setRows(cache.get(key)!);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: Record<string, unknown> = { pageSize: 999999 };
    if (sheet) params.sheet = sheet;

    sourcesApi
      .getData(sourceId, params)
      .then((data: { rows?: Row[] } | Row[]) => {
        if (cancelled) return;
        const fetched: Row[] = Array.isArray(data)
          ? data
          : (data as { rows?: Row[] }).rows ?? [];
        cache.set(key, fetched);
        setRows(fetched);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sourceId, sheet, tick]);

  const cols = useMemo<ColMeta[]>(() => {
    if (rows.length === 0) return [];
    return analyzeColumns(rows);
  }, [rows]);

  return { rows, cols, loading, error, refetch };
}
