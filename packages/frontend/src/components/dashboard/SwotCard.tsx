import type { SwotData } from '../../types';
import { Card } from '../ui/Card';

interface Props {
  swot: SwotData | null;
}

interface QuadrantProps {
  label: string;
  letter: string;
  items: string[];
  accent: string;
  bg: string;
}

function Quadrant({ label, letter, items, accent, bg }: QuadrantProps) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: bg }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: accent }}
        >
          {letter}
        </span>
        <span className="text-xs font-semibold" style={{ color: accent }}>
          {label}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>None detected</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-xs leading-none mt-0.5" style={{ color: accent }}>•</span>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SkeletonQuadrant() {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="h-3 w-20 rounded animate-pulse mb-3" style={{ background: 'var(--color-border)' }} />
      {[80, 90, 70].map((w, i) => (
        <div key={i} className="h-2 rounded animate-pulse mb-1.5" style={{ background: 'var(--color-border)', width: `${w}%` }} />
      ))}
    </div>
  );
}

export function SwotCard({ swot }: Props) {
  return (
    <Card className="h-full">
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
        SWOT Analysis
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {swot === null ? (
          <>
            <SkeletonQuadrant />
            <SkeletonQuadrant />
            <SkeletonQuadrant />
            <SkeletonQuadrant />
          </>
        ) : (
          <>
            <Quadrant
              label="Strengths"
              letter="S"
              items={swot.strengths}
              accent="#16a34a"
              bg="color-mix(in srgb, #16a34a 8%, transparent)"
            />
            <Quadrant
              label="Weaknesses"
              letter="W"
              items={swot.weaknesses}
              accent="#dc2626"
              bg="color-mix(in srgb, #dc2626 8%, transparent)"
            />
            <Quadrant
              label="Opportunities"
              letter="O"
              items={swot.opportunities}
              accent="#2563eb"
              bg="color-mix(in srgb, #2563eb 8%, transparent)"
            />
            <Quadrant
              label="Threats"
              letter="T"
              items={swot.threats}
              accent="#d97706"
              bg="color-mix(in srgb, #d97706 8%, transparent)"
            />
          </>
        )}
      </div>
    </Card>
  );
}
