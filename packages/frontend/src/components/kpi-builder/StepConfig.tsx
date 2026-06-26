import type { ColMeta, ColType, WidgetConfig, WidgetType } from '../../types';

interface Props {
  widgetType: WidgetType;
  config: WidgetConfig;
  cols: ColMeta[];
  onChange: (partial: Partial<WidgetConfig>) => void;
}

// ─── Helper sub-components ────────────────────────────────────────────────────

interface ColSelectProps {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  cols: ColMeta[];
  filter?: ColType[];
  multi?: false; // single select only (multi handled separately)
  placeholder?: string;
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const selectStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
  width: '100%',
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

function ColSelect({ label, value, onChange, cols, filter, placeholder }: ColSelectProps) {
  const filtered = filter ? cols.filter(c => filter.includes(c.data_type)) : cols;
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <select style={selectStyle} value={value ?? ''} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder ?? '— Select column —'}</option>
        {filtered.map(c => (
          <option key={c.name} value={c.name}>{c.display_name || c.name}</option>
        ))}
      </select>
    </div>
  );
}

interface MultiColSelectProps {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  cols: ColMeta[];
  filter?: ColType[];
  max?: number;
}

function MultiColSelect({ label, value, onChange, cols, filter, max }: MultiColSelectProps) {
  const filtered = filter ? cols.filter(c => filter.includes(c.data_type)) : cols;
  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter(v => v !== name));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, name]);
    }
  };
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>
        {label} {max && <span style={{ fontWeight: 400, fontSize: '11px' }}>(up to {max})</span>}
      </label>
      <div
        style={{
          maxHeight: '140px',
          overflowY: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          background: 'var(--color-bg-secondary)',
        }}
      >
        {filtered.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            No matching columns
          </div>
        )}
        {filtered.map(c => (
          <label
            key={c.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--color-text)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <input
              type="checkbox"
              checked={value.includes(c.name)}
              onChange={() => toggle(c.name)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            {c.display_name || c.name}
          </label>
        ))}
      </div>
    </div>
  );
}

interface AggSelectProps {
  value: string | undefined;
  onChange: (v: string) => void;
  label?: string;
}

function AggSelect({ value, onChange, label = 'Aggregation' }: AggSelectProps) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <select style={selectStyle} value={value ?? 'sum'} onChange={e => onChange(e.target.value)}>
        <option value="sum">Sum</option>
        <option value="avg">Average</option>
        <option value="count">Count</option>
        <option value="min">Min</option>
        <option value="max">Max</option>
        <option value="distinct">Distinct Count</option>
      </select>
    </div>
  );
}

interface ToggleProps {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '13px',
        color: 'var(--color-text)',
      }}
    >
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--color-accent)', width: '15px', height: '15px' }}
      />
      {label}
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder }: {
  label: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        style={inputStyle}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder, min, max }: {
  label: string; value: number | undefined; onChange: (v: number) => void;
  placeholder?: string; min?: number; max?: number;
}) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        style={inputStyle}
        value={value ?? ''}
        placeholder={placeholder}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' };
const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '14px' };

// ─── Main component ───────────────────────────────────────────────────────────

export function StepConfig({ widgetType, config, cols, onChange }: Props) {
  if (cols.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
        No columns loaded. Go back and select a data source and sheet.
      </div>
    );
  }

  const numericCols: ColType[] = ['numeric'];
  const dateCatCols: ColType[] = ['date', 'categorical'];
  const catTextCols: ColType[] = ['categorical', 'text', 'boolean'];

  switch (widgetType) {
    case 'kpi':
      return (
        <div style={stack}>
          <ColSelect label="Value Column" value={config.column} onChange={v => onChange({ column: v })} cols={cols} filter={numericCols} />
          <AggSelect value={config.aggregation} onChange={v => onChange({ aggregation: v as WidgetConfig['aggregation'] })} />
          <div style={grid3}>
            <TextInput label="Label" value={config.label} onChange={v => onChange({ label: v })} placeholder="e.g. Total Revenue" />
            <TextInput label="Prefix" value={config.prefix} onChange={v => onChange({ prefix: v })} placeholder="$" />
            <TextInput label="Suffix" value={config.suffix} onChange={v => onChange({ suffix: v })} placeholder="%" />
          </div>
          <ColSelect label="Compare Column (optional)" value={config.compareColumn} onChange={v => onChange({ compareColumn: v })} cols={cols} filter={numericCols} placeholder="— No comparison —" />
        </div>
      );

    case 'line':
    case 'area':
      return (
        <div style={stack}>
          <ColSelect label="X Axis" value={config.xAxis} onChange={v => onChange({ xAxis: v })} cols={cols} filter={dateCatCols} />
          <MultiColSelect label="Y Axis (values)" value={config.yAxis ?? []} onChange={v => onChange({ yAxis: v })} cols={cols} filter={numericCols} max={5} />
          <AggSelect value={config.aggregation} onChange={v => onChange({ aggregation: v as WidgetConfig['aggregation'] })} />
          <div style={grid2}>
            <Toggle label="Smooth curves" value={config.smooth} onChange={v => onChange({ smooth: v })} />
            <Toggle label="Show data dots" value={config.showDots} onChange={v => onChange({ showDots: v })} />
          </div>
        </div>
      );

    case 'bar':
      return (
        <div style={stack}>
          <ColSelect label="Category Column" value={config.categoryColumn} onChange={v => onChange({ categoryColumn: v })} cols={cols} filter={catTextCols} />
          <ColSelect label="Value Column" value={config.valueColumn} onChange={v => onChange({ valueColumn: v })} cols={cols} filter={numericCols} />
          <AggSelect value={config.aggregation} onChange={v => onChange({ aggregation: v as WidgetConfig['aggregation'] })} />
          <div style={grid2}>
            <Toggle label="Horizontal bars" value={config.horizontal} onChange={v => onChange({ horizontal: v })} />
            <Toggle label="Stacked" value={config.stacked} onChange={v => onChange({ stacked: v })} />
          </div>
        </div>
      );

    case 'pie': {
      const countRows = !config.valueColumn;
      return (
        <div style={stack}>
          <ColSelect label="Category Column" value={config.categoryColumn} onChange={v => onChange({ categoryColumn: v })} cols={cols} filter={catTextCols} />
          <div style={fieldStyle}>
            <label style={labelStyle}>Value Source</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={countRows}
                onChange={e => onChange({ valueColumn: e.target.checked ? '' : undefined })}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Count rows (use frequency instead of a numeric column)
            </label>
          </div>
          {!countRows && (
            <ColSelect label="Value Column" value={config.valueColumn} onChange={v => onChange({ valueColumn: v })} cols={cols} filter={numericCols} />
          )}
          <div style={grid2}>
            <NumberInput label="Max Slices" value={config.maxSlices ?? 8} onChange={v => onChange({ maxSlices: v })} min={2} max={20} />
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
              <Toggle label="Donut (inner radius)" value={config.innerRadius} onChange={v => onChange({ innerRadius: v })} />
            </div>
          </div>
        </div>
      );
    }

    case 'scatter':
      return (
        <div style={stack}>
          <div style={grid2}>
            <ColSelect label="X Column" value={config.xColumn} onChange={v => onChange({ xColumn: v })} cols={cols} filter={numericCols} />
            <ColSelect label="Y Column" value={config.yColumn} onChange={v => onChange({ yColumn: v })} cols={cols} filter={numericCols} />
          </div>
          <div style={grid2}>
            <ColSelect label="Size Column (optional)" value={config.sizeColumn} onChange={v => onChange({ sizeColumn: v })} cols={cols} filter={numericCols} placeholder="— None —" />
            <ColSelect label="Color Column (optional)" value={config.colorColumn} onChange={v => onChange({ colorColumn: v })} cols={cols} filter={catTextCols} placeholder="— None —" />
          </div>
        </div>
      );

    case 'table': {
      const pageSizes = [10, 25, 50, 100];
      return (
        <div style={stack}>
          <MultiColSelect label="Columns to display" value={config.columns ?? []} onChange={v => onChange({ columns: v })} cols={cols} />
          <div style={fieldStyle}>
            <label style={labelStyle}>Page Size</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {pageSizes.map(ps => (
                <label key={ps} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pageSize"
                    value={ps}
                    checked={(config.pageSize ?? 25) === ps}
                    onChange={() => onChange({ pageSize: ps })}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  {ps}
                </label>
              ))}
            </div>
          </div>
          <div style={grid2}>
            <Toggle label="Searchable" value={config.searchable} onChange={v => onChange({ searchable: v })} />
            <Toggle label="Sortable columns" value={config.sortable} onChange={v => onChange({ sortable: v })} />
          </div>
        </div>
      );
    }

    case 'comparison':
      return (
        <div style={stack}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Metric 1</p>
          <div style={grid3}>
            <ColSelect label="Column" value={config.column} onChange={v => onChange({ column: v })} cols={cols} filter={numericCols} />
            <AggSelect value={config.aggregation} onChange={v => onChange({ aggregation: v as WidgetConfig['aggregation'] })} />
            <TextInput label="Label" value={config.label} onChange={v => onChange({ label: v })} placeholder="e.g. This Year" />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Metric 2</p>
          <div style={grid3}>
            <ColSelect label="Column" value={config.column2} onChange={v => onChange({ column2: v })} cols={cols} filter={numericCols} />
            <div style={fieldStyle}>
              <label style={labelStyle}>Aggregation</label>
              <select style={selectStyle} value={config.aggregation2 ?? 'sum'} onChange={e => onChange({ aggregation2: e.target.value })}>
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="count">Count</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
                <option value="distinct">Distinct Count</option>
              </select>
            </div>
            <TextInput label="Label" value={config.label2} onChange={v => onChange({ label2: v })} placeholder="e.g. Last Year" />
          </div>
          <Toggle label="Show % difference" value={config.showPct} onChange={v => onChange({ showPct: v })} />
        </div>
      );

    case 'gauge':
      return (
        <div style={stack}>
          <ColSelect label="Value Column" value={config.column} onChange={v => onChange({ column: v })} cols={cols} filter={numericCols} />
          <AggSelect value={config.aggregation} onChange={v => onChange({ aggregation: v as WidgetConfig['aggregation'] })} />
          <div style={grid2}>
            <NumberInput label="Min Value" value={config.minVal} onChange={v => onChange({ minVal: v })} placeholder="0" />
            <NumberInput label="Max Value" value={config.maxVal} onChange={v => onChange({ maxVal: v })} placeholder="100" />
          </div>
          <NumberInput label="Target" value={config.target} onChange={v => onChange({ target: v })} placeholder="Optional target line" />
          <div style={grid2}>
            <NumberInput label="Red Threshold (below)" value={config.redThreshold} onChange={v => onChange({ redThreshold: v })} />
            <NumberInput label="Green Threshold (above)" value={config.greenThreshold} onChange={v => onChange({ greenThreshold: v })} />
          </div>
        </div>
      );

    case 'text':
      return (
        <div style={stack}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Content</label>
            <textarea
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '120px',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
              rows={5}
              value={config.content ?? ''}
              placeholder="Enter text, markdown supported…"
              onChange={e => onChange({ content: e.target.value })}
            />
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--color-text-muted)',
            fontSize: '14px',
            border: '2px dashed var(--color-border)',
            borderRadius: '12px',
          }}
        >
          ⬜ No configuration needed for Spacer widgets.
          <br />
          <span style={{ fontSize: '12px' }}>Spacers create visual breathing room in your layout.</span>
        </div>
      );

    default:
      return null;
  }
}
