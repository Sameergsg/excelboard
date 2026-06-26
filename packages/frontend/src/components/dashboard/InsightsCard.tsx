import { Card } from '../ui/Card';

interface Props {
  insights: string[];
}

export function InsightsCard({ insights }: Props) {
  return (
    <Card className="h-full">
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
        💡 Smart Insights
      </h3>

      {insights.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded animate-pulse"
              style={{
                background: 'var(--color-border)',
                width: i % 2 === 0 ? '90%' : '75%',
              }}
            />
          ))}
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Analyzing data…
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {insights.slice(0, 6).map((insight, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="mt-0.5 text-base leading-none shrink-0"
                style={{ color: 'var(--color-accent)' }}
              >
                •
              </span>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {insight}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
