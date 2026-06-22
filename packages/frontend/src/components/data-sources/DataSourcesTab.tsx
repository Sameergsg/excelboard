import { useEffect, useState } from 'react';
import { Plus, Database } from 'lucide-react';
import { Button } from '../ui/Button';
import { SourceCard } from './SourceCard';
import { AddSourceModal } from './AddSourceModal';
import { useAppStore } from '../../stores/useAppStore';
import { sourcesApi } from '../../lib/api';
import { Spinner } from '../ui/Spinner';

export function DataSourcesTab() {
  const { sources, setSources } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sourcesApi.list().then(data => {
      setSources(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [setSources]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Data Sources</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Connect Excel files from any source</p>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Source
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={32} /></div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center mb-4">
              <Database size={36} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">No data sources yet</h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-sm">Connect your first Excel file to start building dashboards. Supports local files, OneDrive, Azure, Looker, and URLs.</p>
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Your First Source
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sources.map(s => <SourceCard key={s.id} source={s} />)}
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl border-2 border-dashed border-[var(--color-border)] p-6 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors min-h-[200px]"
            >
              <Plus size={24} />
              <span className="text-sm font-medium">Add Source</span>
            </button>
          </div>
        )}
      </div>
      <AddSourceModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
