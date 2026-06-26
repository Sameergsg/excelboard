import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-[var(--color-card)] border-[var(--color-border)] p-4',
        onClick && 'cursor-pointer hover:border-[var(--color-accent)] transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}
