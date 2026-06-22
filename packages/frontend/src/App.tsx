import { useEffect } from 'react';
import { Database, BarChart2, Layout } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './stores/useAppStore';
import { DataSourcesTab } from './components/data-sources/DataSourcesTab';
import { FileDashboard } from './components/file-dashboard/FileDashboard';
import { DashboardBuilder } from './components/builder/DashboardBuilder';
import { ThemeSwitcher } from './components/themes/ThemeSwitcher';
import { applyTheme, getStoredTheme } from './lib/themes';
import { cn } from './lib/utils';

const queryClient = new QueryClient();

const TABS = [
  { id: 'sources' as const, label: 'Data Sources', icon: Database },
  { id: 'file' as const, label: 'File Dashboard', icon: BarChart2 },
  { id: 'builder' as const, label: 'Dashboard Builder', icon: Layout },
];

export default function App() {
  const { activeTab, setActiveTab, sources, activeSourceId } = useAppStore();

  useEffect(() => { applyTheme(getStoredTheme()); }, []);

  const activeSource = sources.find(s => s.id === activeSourceId);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
        <header className="flex items-center border-b px-4 h-14 flex-shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <div className="flex items-center gap-2 mr-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
              <BarChart2 size={16} color="white" />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--color-text)' }}>ExcelBoard</span>
          </div>

          <nav className="flex items-center gap-1 flex-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors')}
                style={activeTab === tab.id
                  ? { background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }
                  : { color: 'var(--color-text-secondary)' }
                }
              >
                <tab.icon size={15} />
                {tab.id === 'file' && activeSource ? activeSource.name : tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </span>
            <ThemeSwitcher />
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'sources' && <DataSourcesTab />}
          {activeTab === 'file' && <FileDashboard />}
          {activeTab === 'builder' && <DashboardBuilder />}
        </main>
      </div>
    </QueryClientProvider>
  );
}
