import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

type Row = Record<string, unknown>;

interface WidgetConfig {
  columns?: string[];
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
}

interface TableWidgetProps {
  rows: Row[];
  config: WidgetConfig;
}

type SortDir = 'asc' | 'desc' | null;

export function TableWidget({ rows, config }: TableWidgetProps) {
  const pageSize = config.pageSize ?? 25;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Determine columns
  const columns = useMemo<string[]>(() => {
    if (config.columns && config.columns.length > 0) return config.columns;
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [config.columns, rows]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => String(row[col] ?? '').toLowerCase().includes(q))
    );
  }, [rows, search, columns]);

  // Sort
  const sortedRows = useMemo(() => {
    if (!sortCol || !sortDir) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      const an = Number(av);
      const bn = Number(bv);
      let cmp: number;
      if (!isNaN(an) && !isNaN(bn)) {
        cmp = an - bn;
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sortedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (col: string) => {
    if (!config.sortable) return;
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortCol(null);
      setSortDir(null);
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (!config.sortable) return null;
    if (sortCol !== col) return <ChevronsUpDown size={12} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {config.searchable && (
        <div className="relative shrink-0">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search…"
            className={cn(
              'w-full pl-7 pr-3 py-1.5 text-xs rounded-lg',
              'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
              'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:border-[var(--color-accent)]'
            )}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={cn(
                    'px-3 py-2 text-left font-semibold text-[var(--color-text-muted)]',
                    'border-b border-[var(--color-border)] whitespace-nowrap',
                    config.sortable && 'cursor-pointer select-none hover:text-[var(--color-text)]'
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-[var(--color-text-muted)]"
                >
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-[var(--color-text)] whitespace-nowrap max-w-[200px] truncate"
                    >
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] shrink-0">
          <span>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sortedRows.length)} of{' '}
            {sortedRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
              className={cn(
                'px-2 py-0.5 rounded border border-[var(--color-border)]',
                'hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              ‹
            </button>
            <span>
              Page {safePage + 1} / {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className={cn(
                'px-2 py-0.5 rounded border border-[var(--color-border)]',
                'hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
