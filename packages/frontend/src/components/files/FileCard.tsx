import { useState } from 'react';
import { FileSpreadsheet, RefreshCw, Trash2, Eye } from 'lucide-react';
import type { DataSource } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import { sourcesApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface Props {
  source: DataSource;
}

function StatusBadge({ status }: { status: DataSource['status'] }) {
  const map = {
    connected: { color: 'var(--color-success)', label: 'Connected' },
    error: { color: 'var(--color-error)', label: 'Error' },
    syncing: { color: '#f59e0b', label: 'Syncing' },
  };
  const { color, label } = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function FileCard({ source }: Props) {
  const { setActiveSourceId, setActiveSheet, setActiveTab, removeSource } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleViewDashboard = () => {
    setActiveSourceId(source.id);
    setActiveSheet(source.active_sheet);
    setActiveTab('dashboard');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await sourcesApi.refresh(source.id);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      await sourcesApi.delete(source.id);
      removeSource(source.id);
    } catch {
      // ignore
    }
  };

  const visibleSheets = source.sheet_names.slice(0, 3);
  const extraSheets = source.sheet_names.length - visibleSheets.length;

  return (
    <Card className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <span
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--color-text)' }}
            title={source.name}
          >
            {source.name}
          </span>
        </div>
        <StatusBadge status={source.status} />
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: `${source.row_count?.toLocaleString() ?? '—'} rows`, color: '#3b82f6' },
          { label: `${source.column_count ?? '—'} cols`, color: '#8b5cf6' },
          { label: `${source.sheet_names?.length ?? 1} sheets`, color: '#10b981' },
        ].map(({ label, color }) => (
          <span
            key={label}
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Last synced */}
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Last synced: {source.last_synced_at ? formatDate(source.last_synced_at) : '—'}
      </p>

      {/* Sheet chips */}
      {source.sheet_names?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSheets.map(s => (
            <span
              key={s}
              className="px-2 py-0.5 rounded text-xs border"
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              {s}
            </span>
          ))}
          {extraSheets > 0 && (
            <span
              className="px-2 py-0.5 rounded text-xs border"
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-muted)',
                borderColor: 'var(--color-border)',
              }}
            >
              +{extraSheets} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={handleViewDashboard} className="flex-1 justify-center">
          <Eye size={13} />
          View Dashboard
        </Button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh"
          className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={handleDelete}
          title={confirmDelete ? 'Click again to confirm' : 'Delete'}
          className="p-1.5 rounded-lg border transition-colors"
          style={{
            borderColor: confirmDelete ? 'var(--color-error)' : 'var(--color-border)',
            color: confirmDelete ? 'var(--color-error)' : 'var(--color-text-secondary)',
            background: confirmDelete ? 'color-mix(in srgb, var(--color-error) 10%, transparent)' : 'transparent',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {confirmDelete && (
        <p className="text-xs text-center" style={{ color: 'var(--color-error)' }}>
          Click delete again to confirm
        </p>
      )}
    </Card>
  );
}
