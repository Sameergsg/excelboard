import type { WidgetType } from '../../types';

const TYPES: { id: WidgetType; emoji: string; label: string }[] = [
  { id: 'kpi',        emoji: '🔢', label: 'KPI Card' },
  { id: 'line',       emoji: '📈', label: 'Line Chart' },
  { id: 'bar',        emoji: '📊', label: 'Bar Chart' },
  { id: 'area',       emoji: '🏔️', label: 'Area Chart' },
  { id: 'pie',        emoji: '🥧', label: 'Pie / Donut' },
  { id: 'scatter',    emoji: '✦',  label: 'Scatter Plot' },
  { id: 'table',      emoji: '📋', label: 'Data Table' },
  { id: 'comparison', emoji: '⚖️', label: 'Comparison' },
  { id: 'gauge',      emoji: '⏱️', label: 'Gauge' },
  { id: 'text',       emoji: '📝', label: 'Text Note' },
  { id: 'spacer',     emoji: '⬜', label: 'Spacer' },
];

interface Props {
  selected: WidgetType | null;
  onSelect: (t: WidgetType) => void;
}

export function StepType({ selected, onSelect }: Props) {
  return (
    <div>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Choose the type of widget you want to add to your dashboard.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '12px',
        }}
      >
        {TYPES.map(({ id, emoji, label }) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                width: '100%',
                minHeight: '110px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 8px',
                borderRadius: '12px',
                border: isSelected
                  ? '2px solid var(--color-accent)'
                  : '2px solid var(--color-border)',
                background: isSelected
                  ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                  : 'var(--color-bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'color-mix(in srgb, var(--color-accent) 6%, var(--color-bg-secondary))';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-secondary)';
                }
              }}
            >
              <span style={{ fontSize: '28px', lineHeight: 1 }}>{emoji}</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
