import { useMemo } from 'react';

import { EffectTypes } from '../types';

interface EffectStripProps {
  colors: string[];
  type: EffectTypes;
  width: number;
  left: number;
}

const FLASH_STOP_SIZE = 5;

function buildBackground(type: EffectTypes, colors: string[]): string {
  switch (type) {
    case EffectTypes.COLOR:
      return colors[0];
    case EffectTypes.FADE:
      return `linear-gradient(to right, ${colors[0]}, ${colors[1]})`;
    case EffectTypes.FLASH:
      return `repeating-linear-gradient(to right, ${colors
        .map(
          (color, i) =>
            `${color} ${FLASH_STOP_SIZE * i}%, ${color} ${FLASH_STOP_SIZE * (i + 1)}%`,
        )
        .join(', ')})`;
    default:
      return 'transparent';
  }
}

export default function EffectStrip({
  type,
  colors,
  width,
  left,
}: EffectStripProps) {
  const background = useMemo(
    () => buildBackground(type, colors),
    [type, colors],
  );

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
