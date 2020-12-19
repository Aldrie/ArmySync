export type EffectTypes = 'color';

export interface IEffect {
  from: number;
  to: number;
  type: EffectTypes;
  colors: string[];
}
