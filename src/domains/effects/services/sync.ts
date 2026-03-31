import { colorEffect, fadeEffect, flashEffect } from './effect';
import { EffectTypes } from '../types';
import type { IEffect, EffectParams } from '../types';

type EffectFn = (params: EffectParams) => string;

const typeEffects: Record<EffectTypes, EffectFn> = {
  [EffectTypes.COLOR]: colorEffect,
  [EffectTypes.FADE]: fadeEffect,
  [EffectTypes.FLASH]: flashEffect,
};

export const sync = (
  effects: IEffect[],
  time: number,
  onChange: (color: string) => void,
) => {
  const effect = effects.find(
    (current) => time >= current.from && time <= current.to,
  );

  if (effect) {
    const func = typeEffects[effect.type];
    const duration = effect.to - effect.from;

    if (func) {
      onChange(
        func({
          colors: effect.colors,
          duration,
          current: time - effect.from,
        }),
      );
    }
  }
};
