import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { FilesTab } from './components/files/FilesTab';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { useAppStore } from './stores/useAppStore';
import { applyTheme, getStoredTheme } from './lib/themes';
import { sourcesApi } from './lib/api';
import type { DataSource } from './types';

export default function App() {
  const { activeTab, setSources } = useAppStore();

  useEffect(() => {
    applyTheme(getStoredTheme());
    sourcesApi.list().then((data: Record<string, unknown>[]) => {
      const sources: DataSource[] = data.map(s => ({
        ...(s as unknown as DataSource),
        sheet_names: Array.isArray(s.sheet_names)
          ? (s.sheet_names as string[])
          : JSON.parse((s.sheet_names as string) || '[]'),
      }));
      setSources(sources);
    }).catch(console.error);
  }, [setSources]);

  return (
    <AppShell>
      {activeTab === 'files' ? <FilesTab /> : <DashboardTab />}
    </AppShell>
  );
}
