import { hexToRgb, rgbToHex } from '../utils/color';
import { lerp } from '../utils/math';

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

export interface Params {
  colors: string[];
  duration: number;
  current: number;
}

export const colorEffect = ({ colors }: Params) => colors[0];

export const fadeEffect = ({ colors, duration, current }: Params) => {
  const startColor = hexToRgb(colors[0]);
  const endColor = hexToRgb(colors[1]);

  const state = ((current * 100) / duration) / 100;

  const r = Math.round(lerp(startColor.r, endColor.r, state));
  const g = Math.round(lerp(startColor.g, endColor.g, state));
  const b = Math.round(lerp(startColor.b, endColor.b, state));

  return rgbToHex(r, g, b);
};

export const flashEffect = ({ colors, current }: Params) => {
  const velocity = 20;
  const index = Math.floor(current * velocity) % colors.length;
  return colors[index];
};
