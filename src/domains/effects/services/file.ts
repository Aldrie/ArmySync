import { invoke } from '@tauri-apps/api/core';

import { isValidNumber, isValidEffectCode } from '../../../lib/validation';
import { EffectTypes } from '../types';
import type { IEffect } from '../types';

export const read = async (path: string): Promise<string> => {
  return invoke<string>('read_effect_file', { path });
};

export const parseString = (string: string): IEffect[] => {
  const effectsString = string.split(/\r?\n/).filter((line) => line.trim());

  return effectsString.map((item) => {
    const [fromString, toString, typeString, ...colorsString] = item.split(' ');

    if (
      !(
        isValidNumber(fromString) &&
        isValidNumber(toString) &&
        isValidEffectCode(typeString) &&
        colorsString.every((color: string) =>
          color.match(/^#(?:[0-9a-fA-F]{3}){1,2}$/g),
        )
      )
    ) {
      throw new Error('Error to parse file');
    }

    return {
      from: Number(fromString),
      to: Number(toString),
      type: typeString as EffectTypes,
      colors: colorsString,
    };
  });
};
