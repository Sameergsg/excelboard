import type { Widget } from '../../types';

export function TextWidget({ widget }: { widget: Widget }) {
  return (
    <div className="h-full overflow-auto p-1 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
      {widget.config.content || <span className="text-[var(--color-text-muted)] italic">No content — edit widget to add text</span>}
    </div>
  );
}
