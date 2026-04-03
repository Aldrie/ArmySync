import { GripVertical } from 'lucide-react';

import { getAllEffectDefinitions } from '../../../domains/effects';

interface EffectPaletteProps {
  onDragStart: (effectType: string) => void;
}

export default function EffectPalette({ onDragStart }: EffectPaletteProps) {
  const definitions = getAllEffectDefinitions();

  return (
    <div className="flex flex-col gap-2">
      {definitions.map((def) => (
        <div
          key={def.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/effect-type', def.type);
            e.dataTransfer.effectAllowed = 'copy';
            onDragStart(def.type);
          }}
          className="flex items-center gap-2 p-2.5 rounded-md bg-surface-high hover:bg-surface-highest transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="size-3.5 text-on-surface-variant shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="block font-display font-bold text-xs text-on-surface">
              {def.label}
            </span>
            <span className="block text-[10px] text-on-surface-variant truncate">
              {def.description}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
