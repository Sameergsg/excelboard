import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { StepType } from './StepType';
import { StepSource } from './StepSource';
import { StepConfig } from './StepConfig';
import { StepFilters } from './StepFilters';
import { StepStyle } from './StepStyle';
import { useAppStore } from '../../stores/useAppStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { sourcesApi } from '../../lib/api';
import type { ColMeta, FilterRow, LocalWidget, WidgetConfig, WidgetType } from '../../types';

type Row = Record<string, unknown>;

interface Props {
  open: boolean;
  onClose: () => void;
  existingWidget?: LocalWidget;
  lockSource?: boolean;
}

// ─── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Type' },
  { n: 2, label: 'Source' },
  { n: 3, label: 'Config' },
  { n: 4, label: 'Filters' },
  { n: 5, label: 'Style' },
];

interface StepIndicatorProps {
  current: number;
  lockedSource: boolean;
}

function StepIndicator({ current, lockedSource }: StepIndicatorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginBottom: '20px',
        overflowX: 'auto',
      }}
    >
      {STEPS.filter(s => !(lockedSource && s.n === 2)).map((s, idx, arr) => {
        const isActive = s.n === current;
        const isDone = s.n < current;
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: idx < arr.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: isActive
                    ? 'var(--color-accent)'
                    : isDone
                    ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)'
                    : 'var(--color-bg-secondary)',
                  color: isActive ? '#fff' : isDone ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  border: isActive
                    ? '2px solid var(--color-accent)'
                    : isDone
                    ? '2px solid color-mix(in srgb, var(--color-accent) 50%, transparent)'
                    : '2px solid var(--color-border)',
                  flexShrink: 0,
                }}
              >
                {isDone ? '✓' : s.n}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'var(--color-accent)' : isDone ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  background: isDone
                    ? 'color-mix(in srgb, var(--color-accent) 40%, transparent)'
                    : 'var(--color-border)',
                  margin: '0 6px',
                  marginBottom: '18px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function KpiBuilderModal({ open, onClose, existingWidget, lockSource = false }: Props) {
  const { activeSourceId, activeSheet } = useAppStore();

  const [step, setStep] = useState(1);
  const [widgetType, setWidgetType] = useState<WidgetType>(existingWidget?.widget_type ?? 'kpi');
  const [sourceId, setSourceId] = useState(existingWidget?.config.sourceId ?? activeSourceId ?? '');
  const [sheetName, setSheetName] = useState(existingWidget?.config.sheetName ?? activeSheet ?? '');
  const [cols, setCols] = useState<ColMeta[]>([]);
  const [config, setConfig] = useState<WidgetConfig>(
    existingWidget
      ? { ...existingWidget.config }
      : {}
  );
  const [filters, setFilters] = useState<FilterRow[]>(existingWidget?.config.filters ?? []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      if (existingWidget) {
        setWidgetType(existingWidget.widget_type);
        setSourceId(existingWidget.config.sourceId ?? activeSourceId ?? '');
        setSheetName(existingWidget.config.sheetName ?? activeSheet ?? '');
        setConfig({ ...existingWidget.config });
        setFilters(existingWidget.config.filters ?? []);
      } else {
        setWidgetType('kpi');
        setSourceId(activeSourceId ?? '');
        setSheetName(activeSheet ?? '');
        setConfig({});
        setFilters([]);
      }
      setStep(1);
      setCols([]);
      setRows([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch rows when source + sheet are set (for filter preview)
  useEffect(() => {
    if (!sourceId || !sheetName) { setRows([]); return; }
    setLoadingRows(true);
    sourcesApi
      .getData(sourceId, { sheet: sheetName, pageSize: 999999 })
      .then((data: { rows?: Row[]; data?: Row[] }) => {
        setRows(data.rows ?? data.data ?? []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false));
  }, [sourceId, sheetName]);

  // Determine actual step numbers (skip step 2 if lockSource)
  const visibleSteps = lockSource ? [1, 3, 4, 5] : [1, 2, 3, 4, 5];

  const currentIndex = visibleSteps.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === visibleSteps.length - 1;

  const goNext = () => {
    if (!isLast) {
      setStep(visibleSteps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    if (!isFirst) {
      setStep(visibleSteps[currentIndex - 1]);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!widgetType;
    if (step === 2) return !!sourceId && !!sheetName;
    if (step === 3) return true; // config is optional for text/spacer
    return true;
  };

  const handleSave = () => {
    const widget: LocalWidget = {
      id: existingWidget?.id ?? `widget-${Date.now()}`,
      widget_type: widgetType,
      config: {
        ...config,
        sourceId,
        sheetName,
        filters,
        title: config.title || widgetType,
      },
      position: existingWidget?.position ?? { x: 0, y: Infinity, w: 4, h: 3 },
    };

    const store = useDashboardStore.getState();
    if (existingWidget) {
      store.updateWidget(widget.id, widget);
    } else {
      store.addWidget(widget);
    }
    onClose();
  };

  const updateConfig = (partial: Partial<WidgetConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  const modalTitle = existingWidget
    ? `Edit Widget — ${existingWidget.config.title || existingWidget.widget_type}`
    : 'Add Widget';

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="xl">
      <StepIndicator current={step} lockedSource={lockSource} />

      {/* Step content */}
      <div style={{ minHeight: '320px' }}>
        {step === 1 && (
          <StepType selected={widgetType} onSelect={t => { setWidgetType(t); }} />
        )}

        {step === 2 && !lockSource && (
          <StepSource
            sourceId={sourceId}
            sheetName={sheetName}
            onSourceChange={id => { setSourceId(id); setSheetName(''); setCols([]); }}
            onSheetChange={s => setSheetName(s)}
            onColumnsLoaded={c => setCols(c)}
          />
        )}

        {step === 3 && (
          <StepConfig
            widgetType={widgetType}
            config={config}
            cols={cols}
            onChange={updateConfig}
          />
        )}

        {step === 4 && (
          <StepFilters
            filters={filters}
            cols={cols}
            rows={rows}
            onChange={setFilters}
          />
        )}

        {step === 5 && (
          <StepStyle config={config} onChange={updateConfig} />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
          gap: '10px',
        }}
      >
        {/* Left: Back */}
        <div>
          {!isFirst && (
            <button
              onClick={goBack}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
        </div>

        {/* Right: Next / Save */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {loadingRows && step === 4 && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading preview…
            </span>
          )}

          {!isLast ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                border: 'none',
                background: canProceed() ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: canProceed() ? '#fff' : 'var(--color-text-muted)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSave}
              style={{
                padding: '8px 28px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {existingWidget ? '✓ Update Widget' : '✓ Add Widget'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
