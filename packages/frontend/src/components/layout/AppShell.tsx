import type { ReactNode } from 'react';
import { BarChart2, FileSpreadsheet, LayoutDashboard } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { ThemeSwitcher } from '../themes/ThemeSwitcher';
import { cn } from '../../lib/utils';

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  const { activeTab, setActiveTab, sources } = useAppStore();

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="flex items-center border-b px-4 h-14 flex-shrink-0 gap-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-accent)' }}
          >
            <BarChart2 size={16} color="white" />
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--color-text)' }}>
            ExcelBoard
          </span>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 flex-1">
          <button
            onClick={() => setActiveTab('files')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'
            )}
            style={
              activeTab === 'files'
                ? { background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }
                : { color: 'var(--color-text-secondary)' }
            }
          >
            <FileSpreadsheet size={15} />
            Files
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'
            )}
            style={
              activeTab === 'dashboard'
                ? { background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }
                : { color: 'var(--color-text-secondary)' }
            }
          >
            <LayoutDashboard size={15} />
            Dashboard
          </button>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {sources.length} {sources.length === 1 ? 'source' : 'sources'}
          </span>
          <ThemeSwitcher />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
}
