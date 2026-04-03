import { useDraggable } from '@dnd-kit/react';
import { icons } from 'lucide-react';

import type { EffectDefinition } from '../../../domains/effects';
import { getAllEffectDefinitions } from '../../../domains/effects';
import { cn } from '../../../lib/cn';

function PaletteItem({ def }: { def: EffectDefinition }) {
  const Icon = icons[def.icon as keyof typeof icons];

  const { ref, isDragSource } = useDraggable({
    id: `palette-${def.type}`,
    type: 'effect',
    data: { effectType: def.type },
  });

  return (
    <div
      ref={ref}
      className={cn(
        `flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-high
        hover:bg-surface-highest hover:scale-[1.015]
        active:ring-1 active:ring-primary/30
        transition-transform duration-150 ease-out
        cursor-grab active:cursor-grabbing`,
        isDragSource && 'opacity-50',
      )}
    >
      {Icon && (
        <div className="w-7 h-7 rounded-md bg-surface-bright flex items-center justify-center shrink-0">
          <Icon className="size-3.5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="block font-display font-bold text-xs text-on-surface">
          {def.label}
        </span>
        <span className="block text-[10px] text-on-surface-variant truncate">
          {def.description}
        </span>
      </div>
    </div>
  );
}

export default function EffectPalette() {
  const definitions = getAllEffectDefinitions();

  return (
    <div className="flex flex-col gap-1.5">
      {definitions.map((def) => (
        <PaletteItem key={def.type} def={def} />
      ))}
    </div>
  );
}
