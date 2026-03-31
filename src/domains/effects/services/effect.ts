import { hexToRgb, rgbToHex } from '../../../lib/color';
import { lerp } from '../../../lib/math';
import type { EffectParams } from '../types';

export const colorEffect = ({ colors }: EffectParams) => colors[0];

export const fadeEffect = ({ colors, duration, current }: EffectParams) => {
  const startColor = hexToRgb(colors[0]);
  const endColor = hexToRgb(colors[1]);

  const state = (current * 100) / duration / 100;

  const r = Math.round(lerp(startColor.r, endColor.r, state));
  const g = Math.round(lerp(startColor.g, endColor.g, state));
  const b = Math.round(lerp(startColor.b, endColor.b, state));

  return rgbToHex(r, g, b);
};

export const flashEffect = ({ colors, current }: EffectParams) => {
  const velocity = 20;
  const index = Math.floor(current * velocity) % colors.length;
  return colors[index];
};
