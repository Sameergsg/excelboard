import { useMemo } from 'react';
import type { WidgetConfig } from '../types';
import { aggregate } from '../lib/utils';

type Row = Record<string, unknown>;
export type ChartPoint = Record<string, string | number>;

/**
 * Groups rows by xAxis column, aggregates each yAxis column using config.aggregation.
 * Returns sorted array of chart points.
 */
export function computeChartData(rows: Row[], config: WidgetConfig): ChartPoint[] {
  const { xAxis, yAxis = [], aggregation = 'sum' } = config;
  if (!xAxis || yAxis.length === 0 || rows.length === 0) return [];

  // Group by xAxis value
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row[xAxis] != null ? String(row[xAxis]) : '(blank)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // Build chart points
  const points: ChartPoint[] = [];
  for (const [key, groupRows] of groups) {
    const point: ChartPoint = { [xAxis]: key };
    for (const col of yAxis) {
      const vals = groupRows.map(r => {
        const v = r[col];
        if (v == null) return null;
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,\s]/g, ''));
        return isNaN(n) ? null : n;
      });
      point[col] = aggregate(vals, aggregation);
    }
    points.push(point);
  }

  // Sort: try numeric sort on x-axis, fall back to string sort
  points.sort((a, b) => {
    const av = a[xAxis]; const bv = b[xAxis];
    const an = Number(av); const bn = Number(bv);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    return String(av).localeCompare(String(bv));
  });

  return points;
}

/**
 * Computes the aggregated KPI value from rows using config.column and config.aggregation.
 */
export function computeKpiValue(rows: Row[], config: WidgetConfig): number {
  const { column, aggregation = 'sum' } = config;
  if (!column || rows.length === 0) return 0;

  if (aggregation === 'count') return rows.length;

  const vals = rows.map(r => {
    const v = r[column];
    if (v == null) return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,\s]/g, ''));
    return isNaN(n) ? null : n;
  });

  if (aggregation === 'distinct') {
    return new Set(rows.map(r => r[column])).size;
  }

  return aggregate(vals, aggregation);
}

// ── Memoized hooks ─────────────────────────────────────────────────────────────

export function useChartData(rows: Row[], config: WidgetConfig): ChartPoint[] {
  return useMemo(() => computeChartData(rows, config), [rows, config]);
}

export function useKpiValue(rows: Row[], config: WidgetConfig): number {
  return useMemo(() => computeKpiValue(rows, config), [rows, config]);
}
