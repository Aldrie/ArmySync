import { invoke } from '@tauri-apps/api/core';

import type { EffectInstance } from '../types';

interface ParsedEffect {
  from: number;
  to: number;
  type: string;
  colors: string[];
}

type ParamsBuilder = (colors: string[]) => Record<string, unknown>;

const EFFECT_PARSERS = new Map<
  string,
  { type: string; buildParams: ParamsBuilder }
>([
  [
    'c',
    {
      type: 'color',
      buildParams: (c) => ({
        color: c[0] ?? '#ffffff',
      }),
    },
  ],
  [
    'f',
    {
      type: 'fade',
      buildParams: (c) => ({
        startColor: c[0] ?? '#ffffff',
        endColor: c[1] ?? '#000000',
      }),
    },
  ],
  [
    's',
    {
      type: 'flash',
      buildParams: (c) => ({
        colors: c,
        velocity: 20,
      }),
    },
  ],
  [
    'b',
    {
      type: 'blackout',
      buildParams: () => ({}),
    },
  ],
]);

const DEFAULT_PARSER = EFFECT_PARSERS.get('c')!;

let nextId = 1;

function toInstance(parsed: ParsedEffect): EffectInstance {
  const parser = EFFECT_PARSERS.get(parsed.type) ?? DEFAULT_PARSER;

  return {
    id: `effect-${Date.now()}-${nextId++}`,
    type: parser.type,
    from: parsed.from,
    to: parsed.to,
    params: parser.buildParams(parsed.colors),
  };
}

export const parse = async (path: string): Promise<EffectInstance[]> => {
  const raw = await invoke<ParsedEffect[]>('parse_effect_file', { path });
  return raw.map(toInstance);
};
