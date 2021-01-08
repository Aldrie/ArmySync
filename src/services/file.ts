import fs from 'fs';
import { isValidNumber, isValidEffectCode } from '../utils/others';
import { IEffect, EffectTypes } from './effect';

export const read = (path: string): Promise<string> => new Promise((resolve) => {
  const fileString = fs.readFileSync(path, { encoding: 'utf8' });
  resolve(fileString);
});

export const parseString = (string: string): IEffect[] => {
  const effectsString = string.split(/\r?\n/);
  const effects: IEffect[] = effectsString.map((item) => {
    const [fromString, toString, typeString, ...colorsString] = item.split(' ');

    if (!(
      isValidNumber(fromString)
      && isValidNumber(toString)
      && isValidEffectCode(typeString)
      && colorsString.every((color: string) => color.match(/^#(?:[0-9a-fA-F]{3}){1,2}$/g))
    )) {
      throw new Error('Error to parse file');
    }

    return {
      from: Number(fromString),
      to: Number(toString),
      type: typeString as EffectTypes,
      colors: colorsString,
    };
  });

  return effects;
};
