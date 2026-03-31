export enum EffectTypes {
  COLOR = 'c',
  FADE = 'f',
  FLASH = 's',
}

export interface IEffect {
  from: number;
  to: number;
  type: EffectTypes;
  colors: string[];
}

export interface EffectParams {
  colors: string[];
  duration: number;
  current: number;
}
