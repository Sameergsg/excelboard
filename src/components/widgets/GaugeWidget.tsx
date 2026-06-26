import { aggregate, formatNumber } from '../../lib/utils';

type Row = Record<string, unknown>;

interface WidgetConfig {
  column?: string;
  aggregation?: string;
  label?: string;
  min?: number;
  max?: number;
  redThreshold?: number;
  greenThreshold?: number;
  target?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

interface GaugeWidgetProps {
  rows: Row[];
  config: WidgetConfig;
}

const W = 200;
const H = 120;
const CX = W / 2;
const CY = 110;
const R = 80;

function polarToXY(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function arcPath(startDeg: number, endDeg: number, r: number) {
  const start = polarToXY(startDeg, r);
  const end = polarToXY(endDeg, r);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function GaugeWidget({ rows, config }: GaugeWidgetProps) {
  const col = config.column || '';
  const agg = (config.aggregation || 'sum') as Parameters<typeof aggregate>[1];

  const vals = rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
  const value = vals.length > 0 ? aggregate(vals, agg) : 0;

  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const redThreshold = config.redThreshold ?? 30;
  const greenThreshold = config.greenThreshold ?? 70;

  // Clamp value to [min, max]
  const clamped = Math.min(Math.max(value, min), max);
  const pct = (clamped - min) / (max - min);
  const angleDeg = pct * 180; // 0° = left (min), 180° = right (max)

  // Gauge arc spans from 0° to 180° (left to right, going through top)
  const START = 0;
  const END = 180;

  // Zone thresholds in degrees
  const redEnd = ((redThreshold - min) / (max - min)) * 180;
  const greenStart = ((greenThreshold - min) / (max - min)) * 180;

  const needlePt = polarToXY(angleDeg, R - 8);
  const needleBase1 = polarToXY(angleDeg + 90, 6);
  const needleBase2 = polarToXY(angleDeg - 90, 6);

  // Color for value
  const pctVal = (value - min) / (max - min);
  const valueColor =
    pctVal <= (redThreshold - min) / (max - min)
      ? 'var(--color-error, #ef4444)'
      : pctVal >= (greenThreshold - min) / (max - min)
      ? 'var(--color-success, #22c55e)'
      : 'var(--color-warning, #f59e0b)';

  const label = config.label || col || 'Value';
  const decimals = config.decimals ?? 1;
  const displayValue = formatNumber(value, decimals);

  // Target marker
  let targetAngle: number | null = null;
  if (config.target !== undefined) {
    const tc = Math.min(Math.max(config.target, min), max);
    targetAngle = ((tc - min) / (max - min)) * 180;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Background arc */}
        <path
          d={arcPath(START, END, R)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={14}
          strokeLinecap="round"
        />

        {/* Red zone */}
        <path
          d={arcPath(START, Math.min(redEnd, angleDeg), R)}
          fill="none"
          stroke="var(--color-error, #ef4444)"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={0.3}
        />
        <path
          d={arcPath(START, redEnd, R)}
          fill="none"
          stroke="var(--color-error, #ef4444)"
          strokeWidth={14}
          opacity={0.15}
        />

        {/* Yellow zone */}
        <path
          d={arcPath(redEnd, greenStart, R)}
          fill="none"
          stroke="var(--color-warning, #f59e0b)"
          strokeWidth={14}
          opacity={0.15}
        />

        {/* Green zone */}
        <path
          d={arcPath(greenStart, END, R)}
          fill="none"
          stroke="var(--color-success, #22c55e)"
          strokeWidth={14}
          opacity={0.15}
        />

        {/* Value arc */}
        {angleDeg > 0 && (
          <path
            d={arcPath(START, angleDeg, R)}
            fill="none"
            stroke={valueColor}
            strokeWidth={14}
            strokeLinecap="round"
          />
        )}

        {/* Target marker */}
        {targetAngle !== null && (
          <>
            {(() => {
              const tp = polarToXY(targetAngle, R);
              const tp2 = polarToXY(targetAngle, R - 18);
              return (
                <line
                  x1={tp.x}
                  y1={tp.y}
                  x2={tp2.x}
                  y2={tp2.y}
                  stroke="var(--color-text)"
                  strokeWidth={2}
                  strokeDasharray="3 2"
                />
              );
            })()}
          </>
        )}

        {/* Needle */}
        <polygon
          points={`${needlePt.x},${needlePt.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={valueColor}
          opacity={0.9}
        />
        {/* Center dot */}
        <circle cx={CX} cy={CY} r={6} fill={valueColor} />
        <circle cx={CX} cy={CY} r={3} fill="var(--color-card)" />

        {/* Min/Max labels */}
        <text
          x={CX - R - 4}
          y={CY + 4}
          fill="var(--color-text-muted)"
          fontSize={9}
          textAnchor="middle"
        >
          {min}
        </text>
        <text
          x={CX + R + 4}
          y={CY + 4}
          fill="var(--color-text-muted)"
          fontSize={9}
          textAnchor="middle"
        >
          {max}
        </text>
      </svg>

      {/* Value display */}
      <div className="text-center -mt-2">
        <div className="flex items-baseline gap-0.5 justify-center">
          {config.prefix && (
            <span className="text-sm text-[var(--color-text-secondary)]">{config.prefix}</span>
          )}
          <span className="text-2xl font-bold tabular-nums" style={{ color: valueColor }}>
            {displayValue}
          </span>
          {config.suffix && (
            <span className="text-sm text-[var(--color-text-secondary)]">{config.suffix}</span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}
