import { useState } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import { THEMES } from '../../lib/themes';
import { useAppStore } from '../../stores/useAppStore';
import type { ThemeId } from '../../types';
import { cn } from '../../lib/utils';

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useAppStore();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition-colors"
        title="Change theme"
      >
        <Palette size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border shadow-2xl p-4 bg-[var(--color-card)] border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Choose Theme</p>

            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--color-text-secondary)]">
                <Sun size={12} /> Light
              </div>
              <div className="grid grid-cols-5 gap-2">
                {THEMES.filter(t => t.type === 'light').map(t => (
                  <ThemeButton key={t.id} t={t} active={theme === t.id} onSelect={(id) => { setTheme(id); setOpen(false); }} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--color-text-secondary)]">
                <Moon size={12} /> Dark
              </div>
              <div className="grid grid-cols-5 gap-2">
                {THEMES.filter(t => t.type === 'dark').map(t => (
                  <ThemeButton key={t.id} t={t} active={theme === t.id} onSelect={(id) => { setTheme(id); setOpen(false); }} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ThemeButton({ t, active, onSelect }: { t: typeof THEMES[0]; active: boolean; onSelect: (id: ThemeId) => void }) {
  return (
    <button
      title={t.name}
      onClick={() => onSelect(t.id)}
      className={cn('relative w-10 h-10 rounded-lg border-2 overflow-hidden transition-all hover:scale-110',
        active ? 'border-[var(--color-accent)] scale-110' : 'border-transparent')}
      style={{ background: t.preview.bg }}
    >
      <div className="absolute inset-x-1 top-1 h-2 rounded-sm" style={{ background: t.preview.accent }} />
      <div className="absolute inset-x-1 bottom-1 h-1 rounded-sm opacity-60" style={{ background: t.preview.text }} />
    </button>
  );
}
