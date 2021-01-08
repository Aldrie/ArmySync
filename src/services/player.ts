import {
  IEffect, colorEffect, EffectTypes, Params, fadeEffect, flashEffect,
} from './effect';

interface ITypeEffects {
  [key: string]: (params: Params) => string;
}

const typeEffects: ITypeEffects = {
  [EffectTypes.COLOR]: colorEffect,
  [EffectTypes.FADE]: fadeEffect,
  [EffectTypes.FLASH]: flashEffect,
};

export const sync = (effects: IEffect[], time: number, onChange: (color: string) => any) => {
  const effect = effects.find((current) => {
    if (time >= current.from && time <= current.to) {
      return true;
    }
    return false;
  });

  if (effect) {
    const func = typeEffects[effect.type];
    const duration = effect.to - effect.from;

    onChange(func ? func({
      colors: effect.colors,
      duration,
      current: time - effect.from,
    }) : null);
  }
};
