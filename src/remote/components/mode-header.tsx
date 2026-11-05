import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { type Mode, useRemoteStore } from '../store';

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'live', label: 'Live' },
  { mode: 'timeline', label: 'Timeline' },
];

export default function ModeHeader({ children }: { children?: ReactNode }) {
  const mode = useRemoteStore((s) => s.mode);
  const setMode = useRemoteStore((s) => s.setMode);

  return (
    <header className="flex items-center gap-2 px-4 py-2">
      <div className="flex rounded-full bg-white/10 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => setMode(tab.mode)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium text-white/60',
              mode === tab.mode && 'bg-white text-black',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Edit pads"
        onClick={() => setMode('edit')}
        className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white"
      >
        <Pencil className="size-4" />
      </button>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}
