import { useDraggable } from '@dnd-kit/react';
import { icons } from 'lucide-react';
import { motion } from 'motion/react';

import type { EffectDefinition } from '../../../domains/effects';
import { getAllEffectDefinitions } from '../../../domains/effects';
import { spring } from '../../../lib/animations';

function PaletteItem({ def }: { def: EffectDefinition }) {
  const Icon = icons[def.icon as keyof typeof icons];

  const { ref, isDragSource } = useDraggable({
    id: `palette-${def.type}`,
    type: 'effect',
    data: { effectType: def.type },
  });

  return (
    <motion.div
      ref={ref}
      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-high hover:bg-surface-highest transition-colors cursor-grab active:cursor-grabbing"
      style={{ opacity: isDragSource ? 0.5 : 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
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
    </motion.div>
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
