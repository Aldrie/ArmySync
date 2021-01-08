import { EffectTypes } from '../services/effect';

export const isValidNumber = (
  value: any,
) => !Number.isNaN(value) && !Number.isNaN(parseFloat(value));

export const isValidEffectCode = (value: any) => {
  const effectValues = Object.keys(EffectTypes).map((key) => EffectTypes[key]);

  return typeof value === 'string' && effectValues.includes(value);
};
