import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../../lib/cn';

interface PanelSectionHeaderProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  controls: string;
  children?: ReactNode;
}

export default function PanelSectionHeader({
  title,
  open,
  onToggle,
  controls,
  children,
}: PanelSectionHeaderProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className="group flex h-11 w-full shrink-0 cursor-pointer items-center gap-2 border-b border-border px-4 text-left hover:bg-surface-container"
    >
      <ChevronDown
        className={cn(
          'size-3.5 shrink-0 text-outline transition-transform',
          !open && '-rotate-90',
        )}
      />
      <h2 className="flex-1 text-xs font-semibold text-on-surface">{title}</h2>
      {children}
    </button>
  );
}
