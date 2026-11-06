import type { ReactNode, ToggleEvent } from 'react';
import { useRef, useState } from 'react';

import { cn } from '../../../lib/cn';

interface PlayerPopoverProps {
  id: string;
  label: string;
  heading: string;
  trigger: ReactNode;
  lit?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: ReactNode;
}

export default function PlayerPopover({
  id,
  label,
  heading,
  trigger,
  lit = false,
  onOpenChange,
  className,
  children,
}: PlayerPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const anchor = triggerRef.current;
    if (e.newState !== 'open' || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    e.currentTarget.style.top = `${rect.bottom + 8}px`;
    e.currentTarget.style.right = `${window.innerWidth - rect.right}px`;
  };

  const handleToggle = (e: ToggleEvent<HTMLDivElement>) => {
    const isOpen = e.newState === 'open';
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label={label}
        aria-expanded={open}
        title={heading}
        className={cn(
          'flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold tabular-nums transition-colors [&_svg]:size-4.25',
          lit
            ? 'bg-primary/14 text-primary hover:bg-primary/20'
            : open
              ? 'bg-surface-high text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface',
        )}
      >
        {trigger}
      </button>
      <div
        id={id}
        popover="auto"
        role="dialog"
        aria-label={heading}
        onBeforeToggle={place}
        onToggle={handleToggle}
        onKeyDown={(e) => {
          if (e.code === 'Space' && e.target instanceof HTMLButtonElement)
            e.stopPropagation();
        }}
        className={cn(
          'inset-auto m-0 max-h-[calc(100vh-4.5rem)] w-75 rounded-lg border border-border-strong bg-surface-container text-on-surface shadow-popover',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
