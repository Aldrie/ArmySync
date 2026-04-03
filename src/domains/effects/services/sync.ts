import { getEffectDefinition } from '../registry';
import type { EffectInstance } from '../types';

export const sync = (
  effects: EffectInstance[],
  time: number,
  onChange: (color: string) => void,
) => {
  const effect = effects.find(
    (current) => time >= current.from && time <= current.to,
  );

  if (effect) {
    const definition = getEffectDefinition(effect.type);
    if (!definition) return;

    const duration = effect.to - effect.from;
    const color = definition.handler({
      params: effect.params,
      duration,
      current: time - effect.from,
    });

    onChange(color);
  }
};
