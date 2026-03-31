import { EffectTypes } from '../domains/effects/types';

export const isValidNumber = (value: string) =>
  !Number.isNaN(value) && !Number.isNaN(parseFloat(value));

export const isValidEffectCode = (value: string) => {
  const effectValues = Object.values(EffectTypes);
  return (
    typeof value === 'string' && effectValues.includes(value as EffectTypes)
  );
};
