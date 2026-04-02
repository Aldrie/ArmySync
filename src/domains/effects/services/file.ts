import { invoke } from '@tauri-apps/api/core';

import type { IEffect } from '../types';

export const parse = async (path: string): Promise<IEffect[]> => {
  return invoke<IEffect[]>('parse_effect_file', { path });
};
