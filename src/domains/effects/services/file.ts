import { invoke } from '@tauri-apps/api/core';

import type { EffectInstance } from '../types';

interface ParsedEffect {
  from: number;
  to: number;
  type: string;
  colors: string[];
}

const TYPE_MAP: Record<string, string> = {
  c: 'color',
  f: 'fade',
  s: 'flash',
};

let nextId = 1;

function toInstance(parsed: ParsedEffect): EffectInstance {
  const type = TYPE_MAP[parsed.type] ?? 'color';
  const id = `effect-${Date.now()}-${nextId++}`;

  switch (type) {
    case 'fade':
      return {
        id,
        type,
        from: parsed.from,
        to: parsed.to,
        params: {
          startColor: parsed.colors[0] ?? '#ffffff',
          endColor: parsed.colors[1] ?? '#000000',
        },
      };

    case 'flash':
      return {
        id,
        type,
        from: parsed.from,
        to: parsed.to,
        params: {
          colors: parsed.colors,
          velocity: 20,
        },
      };

    default:
      return {
        id,
        type,
        from: parsed.from,
        to: parsed.to,
        params: { color: parsed.colors[0] ?? '#ffffff' },
      };
  }
}

export const parse = async (path: string): Promise<EffectInstance[]> => {
  const raw = await invoke<ParsedEffect[]>('parse_effect_file', { path });
  return raw.map(toInstance);
};
