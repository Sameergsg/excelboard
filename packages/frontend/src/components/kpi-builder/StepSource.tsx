import { useEffect, useState } from 'react';
import type { ColMeta } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import { sourcesApi } from '../../lib/api';

interface Props {
  sourceId: string;
  sheetName: string;
  onSourceChange: (id: string) => void;
  onSheetChange: (sheet: string) => void;
  onColumnsLoaded: (cols: ColMeta[]) => void;
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  fontSize: '14px',
  outline: 'none',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
};

export function StepSource({ sourceId, sheetName, onSourceChange, onSheetChange, onColumnsLoaded }: Props) {
  const sources = useAppStore(s => s.sources);
  const [columnCount, setColumnCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedSource = sources.find(s => s.id === sourceId);

  // When source changes, auto-select first sheet
  useEffect(() => {
    if (selectedSource && selectedSource.sheet_names.length > 0) {
      const first = selectedSource.sheet_names[0];
      if (!sheetName || !selectedSource.sheet_names.includes(sheetName)) {
        onSheetChange(first);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  // When sheet changes, fetch stats
  useEffect(() => {
    if (!sourceId || !sheetName) return;
    setLoading(true);
    setColumnCount(null);
    sourcesApi
      .getStats(sourceId, sheetName)
      .then((data: { columns?: ColMeta[]; column_count?: number }) => {
        const cols: ColMeta[] = data.columns ?? [];
        setColumnCount(cols.length || data.column_count || 0);
        onColumnsLoaded(cols);
      })
      .catch(() => {
        setColumnCount(null);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, sheetName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p className="text-sm text-[var(--color-text-muted)]">
        Select the data source and sheet to power this widget.
      </p>

      {/* File dropdown */}
      <div>
        <label style={labelStyle}>File / Data Source</label>
        <select
          style={selectStyle}
          value={sourceId}
          onChange={e => onSourceChange(e.target.value)}
        >
          <option value="">— Select a file —</option>
          {sources.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.status !== 'connected' ? ` (${s.status})` : ''}
            </option>
          ))}
        </select>
        {sources.length === 0 && (
          <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            No data sources connected. Add one from the Files tab.
          </p>
        )}
      </div>

      {/* Sheet dropdown */}
      {selectedSource && (
        <div>
          <label style={labelStyle}>Sheet</label>
          <select
            style={selectStyle}
            value={sheetName}
            onChange={e => onSheetChange(e.target.value)}
            disabled={!sourceId}
          >
            <option value="">— Select a sheet —</option>
            {selectedSource.sheet_names.map(sh => (
              <option key={sh} value={sh}>{sh}</option>
            ))}
          </select>
        </div>
      )}

      {/* Column count badge */}
      {sheetName && selectedSource && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          {loading ? (
            <span>Loading column info…</span>
          ) : (
            <>
              <span
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '2px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {columnCount ?? '—'} columns
              </span>
              <span>
                from <strong style={{ color: 'var(--color-text)' }}>{selectedSource.name}</strong>
                {' / '}
                <strong style={{ color: 'var(--color-text)' }}>{sheetName}</strong>
              </span>
              {selectedSource.row_count > 0 && (
                <span style={{ marginLeft: 'auto' }}>
                  {selectedSource.row_count.toLocaleString()} rows
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
