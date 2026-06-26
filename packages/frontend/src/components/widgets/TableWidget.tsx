import { useEffect, useState } from 'react';
import type { Widget } from '../../types';
import { sourcesApi } from '../../lib/api';
import { Spinner } from '../ui/Spinner';

export function TableWidget({ widget }: { widget: Widget }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!widget.source_id) { setLoading(false); return; }
    sourcesApi.getData(widget.source_id, { pageSize: widget.config.pageSize || 50, sheet: widget.config.sheet })
      .then(r => setRows(r.data))
      .finally(() => setLoading(false));
  }, [widget.source_id, widget.config.sheet, widget.config.pageSize]);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner /></div>;
  const cols = widget.config.columns?.length ? widget.config.columns : Object.keys(rows[0] || {});
  const filtered = search ? rows.filter(r => cols.some((c: string) => String(r[c] ?? '').toLowerCase().includes(search.toLowerCase()))) : rows;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {widget.config.searchable && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="mx-2 mt-2 px-2 py-1 text-xs rounded border bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none" />
      )}
      <div className="overflow-auto flex-1 mt-2">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
            <tr>{cols.map((c: string) => <th key={c} className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-border)] whitespace-nowrap">{c}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                {cols.map((c: string) => <td key={c} className="px-2 py-1 text-[var(--color-text-secondary)] whitespace-nowrap max-w-[120px] truncate">{String(row[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
