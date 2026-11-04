import { useDraggable } from '@dnd-kit/react';
import { GripVertical, icons } from 'lucide-react';

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
        `group flex items-center gap-3 p-2.5 rounded-lg border border-border bg-surface-container shadow-raised
        hover:bg-surface-high hover:border-border-strong
        transition-colors duration-150
        cursor-grab active:cursor-grabbing`,
        isDragSource && 'opacity-40',
      )}
    >
      {Icon && (
        <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="block font-medium text-[13px] leading-tight text-on-surface">
          {def.label}
        </span>
        <span className="mt-0.5 block text-[11px] text-on-surface-variant truncate">
          {def.description}
        </span>
      </div>
      <GripVertical className="size-4 shrink-0 text-outline opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

export default function EffectPalette() {
  const definitions = getAllEffectDefinitions();

  return (
    <div className="flex flex-col gap-2">
      {definitions.map((def) => (
        <PaletteItem key={def.type} def={def} />
      ))}
    </div>
  );
}
