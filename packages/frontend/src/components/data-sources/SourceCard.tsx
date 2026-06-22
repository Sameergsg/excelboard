import { RefreshCw, Trash2, BarChart2, HardDrive, Cloud, Database, Link, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { DataSource } from '../../types';
import { formatDate, formatNumber, sourceTypeLabel } from '../../lib/utils';
import { sourcesApi } from '../../lib/api';
import { useAppStore } from '../../stores/useAppStore';

const ICONS = { local: HardDrive, onedrive: Cloud, azure: Database, looker: BarChart2, url: Link };

interface Props { source: DataSource; }

export function SourceCard({ source }: Props) {
  const { removeSource, updateSource, setActiveSourceId, setActiveTab } = useAppStore();

  async function handleRefresh() {
    updateSource(source.id, { status: 'syncing' });
    try {
      const r = await sourcesApi.refresh(source.id);
      updateSource(source.id, { status: 'connected', row_count: r.rowCount, column_count: r.columnCount, last_synced_at: Math.floor(Date.now() / 1000) });
    } catch { updateSource(source.id, { status: 'error' }); }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${source.name}"?`)) return;
    await sourcesApi.delete(source.id);
    removeSource(source.id);
  }

  const Icon = ICONS[source.source_type] || HardDrive;
  const statusColor = source.status === 'connected' ? 'green' : source.status === 'error' ? 'red' : 'yellow';

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--color-bg-secondary)]">
            <Icon size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--color-text)] leading-tight">{source.name}</h3>
            <span className="text-xs text-[var(--color-text-muted)]">{sourceTypeLabel(source.source_type)}</span>
          </div>
        </div>
        <Badge label={source.status} color={statusColor} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Rows', value: formatNumber(source.row_count) },
          { label: 'Columns', value: formatNumber(source.column_count) },
          { label: 'Sheets', value: source.sheet_names?.length || 1 },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-[var(--color-bg-secondary)] p-2 text-center">
            <div className="text-base font-bold text-[var(--color-text)]">{s.value}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">Last synced: {formatDate(source.last_synced_at)}</p>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => { setActiveSourceId(source.id); setActiveTab('file'); }} className="flex-1">
          <ExternalLink size={13} /> View Dashboard
        </Button>
        <Button size="sm" variant="secondary" onClick={handleRefresh} title="Refresh">
          <RefreshCw size={13} />
        </Button>
        <Button size="sm" variant="danger" onClick={handleDelete} title="Remove">
          <Trash2 size={13} />
        </Button>
      </div>
    </Card>
  );
}
