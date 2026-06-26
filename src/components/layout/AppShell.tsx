import type { ReactNode } from 'react';
import { BarChart2 } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '../../lib/utils';

type Tab = 'files' | 'dashboard';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { activeTab, setActiveTab, sources } = useAppStore();

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <header
        className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-card)]"
        style={{ zIndex: 10 }}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <BarChart2 size={16} />
          </div>
          <span className="text-sm font-bold tracking-tight text-[var(--color-text)]">
            ExcelBoard
          </span>
        </div>

        {/* Center: Tab buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-bg-secondary)]">
          <TabButton
            label="📁 Files"
            value="files"
            active={activeTab === 'files'}
            onClick={() => setActiveTab('files')}
          />
          <TabButton
            label="📊 Dashboard"
            value="dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
        </div>

        {/* Right: source count + theme switcher */}
        <div className="flex items-center gap-3 min-w-[160px] justify-end">
          {sources.length > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </span>
          )}
          <ThemeSwitcher />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  value: Tab;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--color-card)] text-[var(--color-text)] shadow-sm'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
      )}
    >
      {label}
    </button>
  );
}
