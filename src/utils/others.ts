export const isValidNumber = (
  value: any,
) => !Number.isNaN(value) && !Number.isNaN(parseFloat(value));

export const isValidEffectCode = (value: any) => typeof value === 'string' && ['c'].includes(value);
