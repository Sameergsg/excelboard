import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatDate(ts: number | undefined): string {
  if (!ts) return 'Never';
  return new Date(ts * 1000).toLocaleString();
}

export function sourceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    local: 'Local File', onedrive: 'OneDrive', azure: 'Azure Blob',
    looker: 'Looker', url: 'URL',
  };
  return map[type] || type;
}

export function aggregate(values: (number | null)[], method: string): number {
  const nums = values.filter((v): v is number => v !== null && !isNaN(v));
  if (nums.length === 0) return 0;
  switch (method) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'count': return nums.length;
    default: return nums.reduce((a, b) => a + b, 0);
  }
}
