import { X } from 'lucide-react';

interface Props {
  activeFilters: { label: string; key: string }[];
  removeFilter: (key: string) => void;
  clearAll: () => void;
  filteredCount: number;
  totalCount: number;
}

export function ActiveFilterBar({ activeFilters, removeFilter, clearAll, filteredCount, totalCount }: Props) {
  if (activeFilters.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 flex-wrap px-4 py-2 rounded-xl border"
      style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} rows
      </span>

      <div className="w-px h-4 shrink-0" style={{ background: 'var(--color-border)' }} />

      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        {activeFilters.map(f => (
          <span
            key={f.key}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            {f.label}
            <button
              onClick={() => removeFilter(f.key)}
              className="hover:opacity-70 transition-opacity"
              aria-label={`Remove filter: ${f.label}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      <button
        onClick={clearAll}
        className="text-xs font-medium shrink-0 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Clear All
      </button>
    </div>
  );
}
