import type { ColMeta, FilterOperator, FilterRow } from '../../types';

type Row = Record<string, unknown>;

interface Props {
  filters: FilterRow[];
  cols: ColMeta[];
  rows: Row[];
  onChange: (filters: FilterRow[]) => void;
}

// ─── Filter application logic (mirrors backend) ───────────────────────────────

function applyWidgetFilters(rows: Row[], filters: FilterRow[]): Row[] {
  if (filters.length === 0) return rows;

  return rows.filter(row => {
    let result = true;
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      const raw = row[f.column];
      const strVal = raw != null ? String(raw) : '';
      const numVal = Number(raw);

      let match = false;
      switch (f.operator) {
        case 'contains': match = strVal.toLowerCase().includes(f.value.toLowerCase()); break;
        case 'not_contains': match = !strVal.toLowerCase().includes(f.value.toLowerCase()); break;
        case 'equals': match = strVal.toLowerCase() === f.value.toLowerCase(); break;
        case 'not_equals': match = strVal.toLowerCase() !== f.value.toLowerCase(); break;
        case 'starts_with': match = strVal.toLowerCase().startsWith(f.value.toLowerCase()); break;
        case 'ends_with': match = strVal.toLowerCase().endsWith(f.value.toLowerCase()); break;
        case 'is_empty': match = raw == null || strVal === ''; break;
        case 'is_not_empty': match = raw != null && strVal !== ''; break;
        case 'is_one_of': {
          const vals = f.value.split(',').map(v => v.trim().toLowerCase());
          match = vals.includes(strVal.toLowerCase());
          break;
        }
        case 'eq': match = numVal === Number(f.value); break;
        case 'neq': match = numVal !== Number(f.value); break;
        case 'gt': match = numVal > Number(f.value); break;
        case 'gte': match = numVal >= Number(f.value); break;
        case 'lt': match = numVal < Number(f.value); break;
        case 'lte': match = numVal <= Number(f.value); break;
        case 'between': match = numVal >= Number(f.value) && numVal <= Number(f.value2 ?? f.value); break;
        case 'top_n': break; // skip: requires full dataset sort
        case 'bottom_n': break;
        case 'on': match = new Date(strVal).toDateString() === new Date(f.value).toDateString(); break;
        case 'before': match = new Date(strVal) < new Date(f.value); break;
        case 'after': match = new Date(strVal) > new Date(f.value); break;
        case 'date_between': {
          const d = new Date(strVal);
          match = d >= new Date(f.value) && d <= new Date(f.value2 ?? f.value);
          break;
        }
        case 'in_last': {
          const days = Number(f.value);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          match = new Date(strVal) >= cutoff;
          break;
        }
        case 'this_week': {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const monday = new Date(now);
          monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
          monday.setHours(0, 0, 0, 0);
          match = new Date(strVal) >= monday;
          break;
        }
        case 'this_month': {
          const now = new Date();
          match = new Date(strVal).getMonth() === now.getMonth() && new Date(strVal).getFullYear() === now.getFullYear();
          break;
        }
        case 'this_year': match = new Date(strVal).getFullYear() === new Date().getFullYear(); break;
        case 'last_month': {
          const now = new Date();
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const d = new Date(strVal);
          match = d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
          break;
        }
        case 'last_year': match = new Date(strVal).getFullYear() === new Date().getFullYear() - 1; break;
        default: match = true;
      }

      if (i === 0) {
        result = match;
      } else if (f.logic === 'OR') {
        result = result || match;
      } else {
        result = result && match;
      }
    }
    return result;
  });
}

// ─── Operator lists per data type ─────────────────────────────────────────────

const DATE_OPS: { value: FilterOperator; label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'date_between', label: 'Between' },
  { value: 'in_last', label: 'In last N days' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_year', label: 'Last year' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const NUMERIC_OPS: { value: FilterOperator; label: string }[] = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'neq', label: 'Not equals (≠)' },
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater or equal (≥)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less or equal (≤)' },
  { value: 'between', label: 'Between' },
  { value: 'top_n', label: 'Top N' },
  { value: 'bottom_n', label: 'Bottom N' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const TEXT_OPS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'is_one_of', label: 'Is one of' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

function getOpsForCol(col: ColMeta | undefined) {
  if (!col) return TEXT_OPS;
  if (col.data_type === 'date') return DATE_OPS;
  if (col.data_type === 'numeric') return NUMERIC_OPS;
  return TEXT_OPS;
}

function getDefaultOp(col: ColMeta | undefined): FilterOperator {
  if (!col) return 'contains';
  if (col.data_type === 'date') return 'on';
  if (col.data_type === 'numeric') return 'eq';
  return 'contains';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '7px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  fontSize: '13px',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '7px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  fontSize: '13px',
  outline: 'none',
  minWidth: '80px',
};

const noValueOps: FilterOperator[] = ['is_empty', 'is_not_empty', 'this_week', 'this_month', 'this_year', 'last_month', 'last_year'];
const twoValueOps: FilterOperator[] = ['between', 'date_between'];
const dateOps: FilterOperator[] = ['on', 'before', 'after'];
const inLastOp: FilterOperator = 'in_last';

// ─── Value input component ─────────────────────────────────────────────────────

function ValueInput({ filter, onUpdate }: {
  filter: FilterRow;
  onUpdate: (partial: Partial<FilterRow>) => void;
}) {
  const op = filter.operator;

  if (noValueOps.includes(op)) return null;

  if (twoValueOps.includes(op)) {
    const isDate = op === 'date_between';
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1 }}>
        <input
          type={isDate ? 'date' : 'text'}
          style={{ ...inputStyle, flex: 1 }}
          value={filter.value}
          placeholder={isDate ? 'Start' : 'Min'}
          onChange={e => onUpdate({ value: e.target.value })}
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>–</span>
        <input
          type={isDate ? 'date' : 'text'}
          style={{ ...inputStyle, flex: 1 }}
          value={filter.value2 ?? ''}
          placeholder={isDate ? 'End' : 'Max'}
          onChange={e => onUpdate({ value2: e.target.value })}
        />
      </div>
    );
  }

  if (dateOps.includes(op)) {
    return (
      <input
        type="date"
        style={{ ...inputStyle, flex: 1 }}
        value={filter.value}
        onChange={e => onUpdate({ value: e.target.value })}
      />
    );
  }

  if (op === inLastOp) {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1 }}>
        <input
          type="number"
          style={{ ...inputStyle, width: '80px' }}
          value={filter.value}
          min={1}
          placeholder="7"
          onChange={e => onUpdate({ value: e.target.value })}
        />
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>days</span>
      </div>
    );
  }

  if (op === 'is_one_of') {
    return (
      <div style={{ flex: 1 }}>
        <input
          type="text"
          style={{ ...inputStyle, width: '100%' }}
          value={filter.value}
          placeholder="a, b, c"
          onChange={e => onUpdate({ value: e.target.value })}
        />
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
          Separate values with commas
        </div>
      </div>
    );
  }

  return (
    <input
      type="text"
      style={{ ...inputStyle, flex: 1 }}
      value={filter.value}
      placeholder="Value…"
      onChange={e => onUpdate({ value: e.target.value })}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StepFilters({ filters, cols, rows, onChange }: Props) {
  const addFilter = () => {
    const firstCol = cols[0];
    const newFilter: FilterRow = {
      id: crypto.randomUUID(),
      column: firstCol?.name ?? '',
      operator: getDefaultOp(firstCol),
      value: '',
      logic: 'AND',
    };
    onChange([...filters, newFilter]);
  };

  const updateFilter = (id: string, partial: Partial<FilterRow>) => {
    onChange(filters.map(f => (f.id === id ? { ...f, ...partial } : f)));
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter(f => f.id !== id));
  };

  const toggleLogic = (id: string) => {
    onChange(
      filters.map(f =>
        f.id === id ? { ...f, logic: f.logic === 'AND' ? 'OR' : 'AND' } : f
      )
    );
  };

  const filteredCount = applyWidgetFilters(rows, filters).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
        Add filters to narrow down the data shown in this widget.
      </p>

      {filters.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            border: '2px dashed var(--color-border)',
            borderRadius: '10px',
            color: 'var(--color-text-muted)',
            fontSize: '13px',
          }}
        >
          No filters — widget will show all rows.
        </div>
      )}

      {filters.map((filter, idx) => {
        const col = cols.find(c => c.name === filter.column);
        const ops = getOpsForCol(col);

        return (
          <div key={filter.id}>
            {/* AND / OR logic connector between rows */}
            {idx > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <button
                  onClick={() => toggleLogic(filter.id)}
                  style={{
                    padding: '3px 14px',
                    borderRadius: '999px',
                    border: '1px solid var(--color-accent)',
                    background: filter.logic === 'OR'
                      ? 'var(--color-accent)'
                      : 'transparent',
                    color: filter.logic === 'OR' ? '#fff' : 'var(--color-accent)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                  }}
                >
                  {filter.logic}
                </button>
              </div>
            )}

            {/* Filter row */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              {/* Column */}
              <select
                style={{ ...selectStyle, minWidth: '130px' }}
                value={filter.column}
                onChange={e => {
                  const newCol = cols.find(c => c.name === e.target.value);
                  updateFilter(filter.id, {
                    column: e.target.value,
                    operator: getDefaultOp(newCol),
                    value: '',
                    value2: undefined,
                  });
                }}
              >
                <option value="">— Column —</option>
                {cols.map(c => (
                  <option key={c.name} value={c.name}>{c.display_name || c.name}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                style={{ ...selectStyle, minWidth: '140px' }}
                value={filter.operator}
                onChange={e =>
                  updateFilter(filter.id, {
                    operator: e.target.value as FilterOperator,
                    value: '',
                    value2: undefined,
                  })
                }
              >
                {ops.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <ValueInput filter={filter} onUpdate={p => updateFilter(filter.id, p)} />
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFilter(filter.id)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '7px',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                title="Remove filter"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      {/* Add filter button */}
      <button
        onClick={addFilter}
        disabled={cols.length === 0}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px dashed var(--color-accent)',
          background: 'transparent',
          color: 'var(--color-accent)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: cols.length === 0 ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
          opacity: cols.length === 0 ? 0.5 : 1,
        }}
      >
        + Add Filter
      </button>

      {/* Live preview */}
      {rows.length > 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
            fontSize: '13px',
            color: 'var(--color-text)',
          }}
        >
          This widget will show{' '}
          <strong>{filteredCount.toLocaleString()}</strong> of{' '}
          <strong>{rows.length.toLocaleString()}</strong> rows
          {filters.length > 0 && ` after ${filters.length} filter${filters.length > 1 ? 's' : ''}`}.
        </div>
      )}
    </div>
  );
}
