export type EffectTypes = 'c';

export interface IEffect {
  from: number;
  to: number;
  type: EffectTypes;
  colors: string[];
}
