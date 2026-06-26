import { useState } from 'react';
import type { WidgetConfig } from '../../types';

interface Props {
  config: WidgetConfig;
  onChange: (partial: Partial<WidgetConfig>) => void;
}

const BG_COLORS = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'Card', value: 'var(--color-card)' },
  { label: 'Accent tint', value: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-card))' },
  { label: 'Slate', value: '#334155' },
  { label: 'Emerald', value: '#064e3b' },
  { label: 'Indigo', value: '#1e1b4b' },
];

const BORDER_STYLES: { value: WidgetConfig['borderStyle']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'prominent', label: 'Prominent' },
];

const COLOR_SCHEMES = [
  { label: 'Default', value: 'default', colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'] },
  { label: 'Warm', value: 'warm', colors: ['#ef4444', '#f97316', '#eab308', '#84cc16'] },
  { label: 'Cool', value: 'cool', colors: ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899'] },
  { label: 'Earth', value: 'earth', colors: ['#92400e', '#78350f', '#713f12', '#365314'] },
];

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '8px',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
};

export function StepStyle({ config, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Collapsible trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid var(--color-border)',
          background: open ? 'var(--color-bg-secondary)' : 'transparent',
          color: 'var(--color-text)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>
          ▶
        </span>
        Style Options <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '12px' }}>(optional)</span>
      </button>

      {open && (
        <div
          style={{
            marginTop: '12px',
            padding: '16px',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Widget Title */}
          <div>
            <label style={labelStyle}>Widget Title</label>
            <input
              type="text"
              style={inputStyle}
              value={config.title ?? ''}
              placeholder="e.g. Monthly Revenue"
              onChange={e => onChange({ title: e.target.value })}
            />
          </div>

          {/* Background Color */}
          <div>
            <label style={labelStyle}>Background Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {BG_COLORS.map(({ label, value }) => {
                const isSelected = (config.bgColor ?? 'var(--color-card)') === value;
                return (
                  <button
                    key={value}
                    title={label}
                    onClick={() => onChange({ bgColor: value })}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: isSelected ? '3px solid var(--color-accent)' : '2px solid var(--color-border)',
                      cursor: 'pointer',
                      background: value === 'transparent'
                        ? 'repeating-conic-gradient(#aaa 0% 25%, transparent 0% 50%) 0 0 / 10px 10px'
                        : value,
                      flexShrink: 0,
                      outline: 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Border Style */}
          <div>
            <label style={labelStyle}>Border Style</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {BORDER_STYLES.map(({ value, label }) => {
                const isSelected = (config.borderStyle ?? 'subtle') === value;
                return (
                  <button
                    key={value}
                    onClick={() => onChange({ borderStyle: value })}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '8px',
                      border: isSelected
                        ? '2px solid var(--color-accent)'
                        : '2px solid var(--color-border)',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                        : 'var(--color-bg-secondary)',
                      color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart Color Scheme */}
          <div>
            <label style={labelStyle}>Chart Color Scheme</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {COLOR_SCHEMES.map(({ value, label, colors }) => {
                const isSelected = (config.colorScheme ?? 'default') === value;
                return (
                  <button
                    key={value}
                    onClick={() => onChange({ colorScheme: value })}
                    title={label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: isSelected
                        ? '2px solid var(--color-accent)'
                        : '2px solid var(--color-border)',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                        : 'var(--color-bg-secondary)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {colors.map(c => (
                        <div
                          key={c}
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '3px',
                            background: c,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
