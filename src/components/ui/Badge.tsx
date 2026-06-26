import { cn } from '../../lib/utils';

type Color = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';

const C: Record<Color, string> = {
  green: 'bg-green-500/15 text-green-400',
  red: 'bg-red-500/15 text-red-400',
  yellow: 'bg-yellow-500/15 text-yellow-400',
  blue: 'bg-blue-500/15 text-[var(--color-accent)]',
  purple: 'bg-purple-500/15 text-purple-400',
  gray: 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]',
};

export function Badge({ label, color = 'gray' }: { label: string; color?: Color }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        C[color]
      )}
    >
      {label}
    </span>
  );
}
