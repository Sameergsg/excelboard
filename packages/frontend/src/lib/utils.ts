import type { FilterRow } from '../types';

export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
}

export function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function aggregate(vals: (number | null)[], method: string): number {
  const nums = vals.filter((v): v is number => v != null && !isNaN(v));
  if (nums.length === 0) return 0;
  switch (method) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'count': return nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'distinct': return new Set(nums).size;
    default: return nums.reduce((a, b) => a + b, 0);
  }
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ── Filter helpers ─────────────────────────────────────────────────────────────

function toNum(v: unknown): number { return Number(v); }
function toStr(v: unknown): string { return v == null ? '' : String(v); }
function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(toStr(v));
  return isNaN(d.getTime()) ? null : d;
}

function startOfWeek(d: Date): Date {
  const c = new Date(d); c.setHours(0,0,0,0); c.setDate(c.getDate() - c.getDay()); return c;
}
function endOfWeek(d: Date): Date {
  const c = startOfWeek(d); c.setDate(c.getDate() + 6); c.setHours(23,59,59,999); return c;
}

function cellMatchesFilter(cellVal: unknown, filter: FilterRow): boolean {
  const { operator, value, value2 } = filter;
  const str = toStr(cellVal).toLowerCase();
  const fv = value.toLowerCase();

  switch (operator) {
    // text
    case 'contains': return str.includes(fv);
    case 'not_contains': return !str.includes(fv);
    case 'equals': return str === fv;
    case 'not_equals': return str !== fv;
    case 'starts_with': return str.startsWith(fv);
    case 'ends_with': return str.endsWith(fv);
    case 'is_empty': return cellVal == null || str === '';
    case 'is_not_empty': return cellVal != null && str !== '';
    case 'is_one_of': {
      const opts = value.split(',').map(s => s.trim().toLowerCase());
      return opts.includes(str);
    }
    // numeric
    case 'eq': return toNum(cellVal) === toNum(value);
    case 'neq': return toNum(cellVal) !== toNum(value);
    case 'gt': return toNum(cellVal) > toNum(value);
    case 'gte': return toNum(cellVal) >= toNum(value);
    case 'lt': return toNum(cellVal) < toNum(value);
    case 'lte': return toNum(cellVal) <= toNum(value);
    case 'between': {
      const n = toNum(cellVal);
      return n >= toNum(value) && n <= toNum(value2 ?? value);
    }
    // top_n / bottom_n handled outside per-row (needs full column context)
    case 'top_n': return true; // placeholder — handled in applyWidgetFilters
    case 'bottom_n': return true;
    // date
    case 'on': {
      const d = toDate(cellVal); const f = toDate(value);
      if (!d || !f) return false;
      return d.toDateString() === f.toDateString();
    }
    case 'before': {
      const d = toDate(cellVal); const f = toDate(value);
      return !!d && !!f && d < f;
    }
    case 'after': {
      const d = toDate(cellVal); const f = toDate(value);
      return !!d && !!f && d > f;
    }
    case 'date_between': {
      const d = toDate(cellVal); const f1 = toDate(value); const f2 = toDate(value2 ?? value);
      return !!d && !!f1 && !!f2 && d >= f1 && d <= f2;
    }
    case 'in_last': {
      const d = toDate(cellVal); if (!d) return false;
      const days = parseInt(value, 10) || 30;
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      return d >= cutoff;
    }
    case 'this_week': {
      const d = toDate(cellVal); if (!d) return false;
      const now = new Date();
      return d >= startOfWeek(now) && d <= endOfWeek(now);
    }
    case 'this_month': {
      const d = toDate(cellVal); if (!d) return false;
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    case 'this_year': {
      const d = toDate(cellVal); if (!d) return false;
      return d.getFullYear() === new Date().getFullYear();
    }
    case 'last_month': {
      const d = toDate(cellVal); if (!d) return false;
      const now = new Date();
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    case 'last_year': {
      const d = toDate(cellVal); if (!d) return false;
      return d.getFullYear() === new Date().getFullYear() - 1;
    }
    default: return true;
  }
}

export function sourceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    local: 'Local File',
    onedrive: 'OneDrive',
    azure: 'Azure Blob',
    looker: 'Looker',
    url: 'URL',
  };
  return map[type] ?? type;
}

export function applyWidgetFilters(
  rows: Record<string, unknown>[],
  filters: FilterRow[],
): Record<string, unknown>[] {
  if (!filters || filters.length === 0) return rows;

  // Pre-compute top_n / bottom_n sets
  const rankSets = new Map<string, Set<unknown>>();
  for (const f of filters) {
    if (f.operator === 'top_n' || f.operator === 'bottom_n') {
      const n = parseInt(f.value, 10) || 10;
      const vals = rows
        .map(r => ({ row: r, v: Number(r[f.column]) }))
        .filter(x => !isNaN(x.v))
        .sort((a, b) => f.operator === 'top_n' ? b.v - a.v : a.v - b.v)
        .slice(0, n)
        .map(x => x.row);
      rankSets.set(f.id, new Set(vals));
    }
  }

  return rows.filter(row => {
    let result = true;
    let firstFilter = true;

    for (const f of filters) {
      let match: boolean;
      if (rankSets.has(f.id)) {
        match = rankSets.get(f.id)!.has(row);
      } else {
        match = cellMatchesFilter(row[f.column], f);
      }

      if (firstFilter) {
        result = match;
        firstFilter = false;
      } else if (f.logic === 'OR') {
        result = result || match;
      } else {
        result = result && match;
      }
    }
    return result;
  });
}
