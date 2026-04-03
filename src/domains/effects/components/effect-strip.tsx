import { useMemo } from 'react';

import { getEffectDefinition } from '../registry';
import type { EffectInstance } from '../types';

interface EffectStripProps {
  effect: EffectInstance;
  width: number;
  left: number;
}

export default function EffectStrip({ effect, width, left }: EffectStripProps) {
  const background = useMemo(() => {
    const definition = getEffectDefinition(effect.type);
    if (!definition) return 'transparent';
    return definition.buildStripBackground(effect.params);
  }, [effect.type, effect.params]);

  return (
    <div
      className="absolute h-full rounded-lg"
      style={{
        width: `${width || 0}%`,
        left: `${left || 0}%`,
        background,
      }}
    />
  );
}
