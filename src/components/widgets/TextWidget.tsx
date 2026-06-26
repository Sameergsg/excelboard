type Row = Record<string, unknown>;

interface WidgetConfig {
  content?: string;
}

interface TextWidgetProps {
  rows: Row[];
  config: WidgetConfig;
}

export function TextWidget({ config }: TextWidgetProps) {
  const text = config.content ?? '';

  return (
    <div className="h-full overflow-auto">
      <pre
        className="whitespace-pre-wrap text-sm text-[var(--color-text)] leading-relaxed font-sans"
        style={{ margin: 0 }}
      >
        {text || (
          <span className="text-[var(--color-text-muted)] italic">No content</span>
        )}
      </pre>
    </div>
  );
}
