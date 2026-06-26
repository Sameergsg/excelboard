import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import type { DataSource } from '../../types';
import { useAppStore } from '../../stores/useAppStore';

interface Props {
  source: DataSource | null;
  activeSheet: string;
  onSheetSelect: (sheet: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function SheetSidebar({ source, activeSheet, onSheetSelect, collapsed, onToggle }: Props) {
  const { sources, setActiveSourceId, setActiveSheet } = useAppStore();

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setActiveSourceId(id);
    const src = sources.find(s => s.id === id);
    if (src) setActiveSheet(src.active_sheet || src.sheet_names?.[0] || '');
  };

  return (
    <div
      className="flex flex-col border-r shrink-0 transition-all duration-200 overflow-hidden"
      style={{
        width: collapsed ? '40px' : '220px',
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center w-full py-2 border-b hover:bg-[var(--color-bg-secondary)] transition-colors shrink-0"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {!collapsed && (
        <>
          {/* Source switcher */}
          {sources.length > 1 && (
            <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Data Source
              </label>
              <select
                value={source?.id ?? ''}
                onChange={handleSourceChange}
                className="w-full text-xs rounded-lg px-2 py-1.5 border outline-none"
                style={{
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sheet label */}
          <div className="px-3 py-2 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Sheets
            </p>
          </div>

          {/* Sheet list */}
          <div className="flex-1 overflow-y-auto">
            {(source?.sheet_names ?? []).map(sheet => {
              const isActive = sheet === activeSheet;
              return (
                <button
                  key={sheet}
                  onClick={() => onSheetSelect(sheet)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--color-bg-secondary)]"
                  style={{
                    background: isActive ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                  }}
                >
                  <Layers size={13} style={{ flexShrink: 0 }} />
                  <span className="truncate">{sheet}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Collapsed: show icons only */}
      {collapsed && (
        <div className="flex flex-col items-center pt-2 gap-1">
          {(source?.sheet_names ?? []).map(sheet => {
            const isActive = sheet === activeSheet;
            return (
              <button
                key={sheet}
                onClick={() => onSheetSelect(sheet)}
                title={sheet}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{
                  background: isActive ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                <Layers size={14} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
