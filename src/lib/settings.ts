import { invoke } from '@tauri-apps/api/core';

import { clampLatency } from '../domains/remote/calibration';

export type PlayerMode = 'video' | 'lights';

export interface Settings {
  bleDelays: Record<string, number>;
  remoteLatencyMs: number;
  playerMode: PlayerMode;
  followOffsets: Record<string, number>;
  followChoices: Record<string, string>;
}

type StoredSettings = Settings & Record<string, unknown>;

export const clampDelay = (ms: number) => Math.max(0, Math.min(200, ms));

export const clampOffset = (ms: number) =>
  Math.round(Math.max(-1000, Math.min(1000, ms)) / 10) * 10;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseNumbers = (
  value: unknown,
  clamp: (ms: number) => number,
): Record<string, number> =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value)
          .filter((entry): entry is [string, number] =>
            Number.isFinite(entry[1]),
          )
          .map(([id, ms]) => [id, clamp(ms)]),
      )
    : {};

const parseChoices = (value: unknown): Record<string, string> =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
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
  followOffsets: {},
  followChoices: {},
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
          bleDelays: parseNumbers(value.bleDelays, clampDelay),
          remoteLatencyMs: parseLatency(value.remoteLatencyMs),
          playerMode: parsePlayerMode(value.playerMode),
          followOffsets: parseNumbers(value.followOffsets, clampOffset),
          followChoices: parseChoices(value.followChoices),
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
    followOffsets: { ...stored.followOffsets },
    followChoices: { ...stored.followChoices },
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
