import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { THEMES, applyTheme } from '../../lib/themes';
import { useAppStore } from '../../stores/useAppStore';
import { cn } from '../../lib/utils';

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useAppStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (themeId: string) => {
    setTheme(themeId as Parameters<typeof setTheme>[0]);
    applyTheme(themeId as Parameters<typeof applyTheme>[0]);
    setOpen(false);
  };

  const themeEntries = Object.entries(THEMES);
  const lightThemes = themeEntries.filter(([, t]) => t.mode === 'light');
  const darkThemes = themeEntries.filter(([, t]) => t.mode === 'dark');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        aria-label="Switch theme"
        title="Switch theme"
      >
        <Palette size={18} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 bottom-full mb-2 z-50',
            'rounded-xl border shadow-xl p-3 w-64',
            'bg-[var(--color-card)] border-[var(--color-border)]'
          )}
        >
          <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
            Light
          </p>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {lightThemes.map(([id, def]) => (
              <ThemeSwatch
                key={id}
                themeId={id}
                def={def}
                active={theme === id}
                onSelect={handleSelect}
              />
            ))}
          </div>

          <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
            Dark
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {darkThemes.map(([id, def]) => (
              <ThemeSwatch
                key={id}
                themeId={id}
                def={def}
                active={theme === id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SwatchProps {
  themeId: string;
  def: { label: string; colors: { bg: string; accent: string; text: string } };
  active: boolean;
  onSelect: (id: string) => void;
}

function ThemeSwatch({ themeId, def, active, onSelect }: SwatchProps) {
  const { colors, label } = def;
  return (
    <button
      onClick={() => onSelect(themeId)}
      title={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: colors.bg,
        border: active ? `2px solid ${colors.accent}` : '2px solid transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        outline: active ? `3px solid ${colors.accent}` : 'none',
        outlineOffset: 1,
      }}
    >
      {/* Mini preview: accent strip + text dot */}
      <div
        style={{
          width: 22,
          height: 8,
          borderRadius: 3,
          background: colors.accent,
        }}
      />
      <div
        style={{
          width: 16,
          height: 5,
          borderRadius: 2,
          background: colors.text,
          opacity: 0.4,
        }}
      />
    </button>
  );
}
