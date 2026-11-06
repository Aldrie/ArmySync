import { invoke } from '@tauri-apps/api/core';

import { clampLatency } from '../domains/remote/calibration';

export type PlayerMode = 'video' | 'lights';

export interface Settings {
  bleDelays: Record<string, number>;
  remoteLatencyMs: number;
  playerMode: PlayerMode;
}

type StoredSettings = Settings & Record<string, unknown>;

export const clampDelay = (ms: number) => Math.max(0, Math.min(200, ms));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseDelays = (value: unknown): Record<string, number> =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value)
          .filter((entry): entry is [string, number] =>
            Number.isFinite(entry[1]),
          )
          .map(([id, ms]) => [id, clampDelay(ms)]),
      )
    : {};

const parseLatency = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? clampLatency(value) : 0;

const parsePlayerMode = (value: unknown): PlayerMode =>
  value === 'lights' ? 'lights' : 'video';

let stored: StoredSettings = {
  bleDelays: {},
  remoteLatencyMs: 0,
  playerMode: 'video',
};
let writable = false;
let loading: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export const loadSettings = (): Promise<Settings> => {
  loading ??= invoke<unknown>('read_app_json', { name: 'settings' })
    .then((value) => {
      if (value !== null && !isRecord(value)) {
        throw new Error('Invalid settings file');
      }
      if (value) {
        stored = {
          ...value,
          bleDelays: parseDelays(value.bleDelays),
          remoteLatencyMs: parseLatency(value.remoteLatencyMs),
          playerMode: parsePlayerMode(value.playerMode),
        };
      }
      writable = true;
    })
    .catch((e: unknown) => {
      console.error('Failed to load settings:', e);
    });
  return loading.then(() => ({
    ...stored,
    bleDelays: { ...stored.bleDelays },
  }));
};

export const updateSettings = async (
  patch: Partial<Settings>,
): Promise<Settings> => {
  await loadSettings();
  stored = { ...stored, ...patch };
  // Writing after a failed read would overwrite settings we never saw.
  if (writable) {
    const value = stored;
    writeQueue = writeQueue
      .then(() => invoke<void>('write_app_json', { name: 'settings', value }))
      .catch((e: unknown) => console.error('Failed to save settings:', e));
    await writeQueue;
  }
  return { ...stored };
};
