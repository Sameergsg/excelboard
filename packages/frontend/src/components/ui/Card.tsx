import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 transition-shadow',
        'bg-[var(--color-card)] border-[var(--color-border)]',
        onClick && 'cursor-pointer hover:shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}
