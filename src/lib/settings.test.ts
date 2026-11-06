import { beforeEach, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const invokeMock = vi.mocked(invoke);
const writes = () =>
  invokeMock.mock.calls.filter(([cmd]) => cmd === 'write_app_json');

const importSettings = () => import('./settings');

beforeEach(() => {
  vi.resetModules();
  invokeMock.mockReset();
});

it('returns defaults when the settings file is missing', async () => {
  invokeMock.mockResolvedValue(null);
  const { loadSettings } = await importSettings();
  expect(await loadSettings()).toEqual({
    bleDelays: {},
    remoteLatencyMs: 0,
    playerMode: 'video',
    followOffsets: {},
    followChoices: {},
  });
});

it('clamps saved delays and ignores non-numeric entries', async () => {
  invokeMock.mockResolvedValue({
    bleDelays: { a: 500, b: -10, c: 'x', d: 60 },
  });
  const { loadSettings } = await importSettings();
  expect((await loadSettings()).bleDelays).toEqual({ a: 200, b: 0, d: 60 });
});

it('clamps the saved remote latency to ±500 ms', async () => {
  invokeMock.mockResolvedValue({ remoteLatencyMs: 900 });
  const { loadSettings } = await importSettings();
  expect((await loadSettings()).remoteLatencyMs).toBe(500);
});

it('keeps a negative remote latency', async () => {
  invokeMock.mockResolvedValue({ remoteLatencyMs: -42 });
  const { loadSettings } = await importSettings();
  expect((await loadSettings()).remoteLatencyMs).toBe(-42);
});

it('merges a patch while keeping other stored keys', async () => {
  invokeMock.mockResolvedValueOnce({ theme: 'dark', bleDelays: { b: 10 } });
  const { updateSettings } = await importSettings();
  await updateSettings({ bleDelays: { a: 40 } });
  expect(writes()).toHaveLength(1);
  expect(writes()[0][1]).toEqual({
    name: 'settings',
    value: {
      theme: 'dark',
      bleDelays: { a: 40 },
      remoteLatencyMs: 0,
      playerMode: 'video',
      followOffsets: {},
      followChoices: {},
    },
  });
});

it('serializes quick patches so the latest one is written last', async () => {
  let finishFirstWrite = () => {};
  invokeMock
    .mockResolvedValueOnce({ theme: 'dark' })
    .mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishFirstWrite = resolve)),
    );
  const { updateSettings } = await importSettings();
  const first = updateSettings({ bleDelays: { a: 40 } });
  const second = updateSettings({ bleDelays: { a: 40, b: 10 } });
  await vi.waitFor(() => expect(writes()).toHaveLength(1));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(writes()).toHaveLength(1);
  finishFirstWrite();
  await Promise.all([first, second]);
  expect(writes().map(([, args]) => args)).toEqual([
    {
      name: 'settings',
      value: {
        theme: 'dark',
        bleDelays: { a: 40 },
        remoteLatencyMs: 0,
        playerMode: 'video',
        followOffsets: {},
        followChoices: {},
      },
    },
    {
      name: 'settings',
      value: {
        theme: 'dark',
        bleDelays: { a: 40, b: 10 },
        remoteLatencyMs: 0,
        playerMode: 'video',
        followOffsets: {},
        followChoices: {},
      },
    },
  ]);
});

it('never writes after a failed read', async () => {
  invokeMock.mockRejectedValueOnce(new Error('disk'));
  const { loadSettings, updateSettings } = await importSettings();
  expect(await loadSettings()).toEqual({
    bleDelays: {},
    remoteLatencyMs: 0,
    playerMode: 'video',
    followOffsets: {},
    followChoices: {},
  });
  await updateSettings({ bleDelays: { a: 40 } });
  expect(writes()).toHaveLength(0);
});

it('loadSettings reflects a previous updateSettings', async () => {
  invokeMock.mockResolvedValue(null);
  const { loadSettings, updateSettings } = await importSettings();
  await loadSettings();
  await updateSettings({ bleDelays: { a: 40 } });
  expect(await loadSettings()).toEqual({
    bleDelays: { a: 40 },
    remoteLatencyMs: 0,
    playerMode: 'video',
    followOffsets: {},
    followChoices: {},
  });
});

it('keeps a saved Lights only player mode', async () => {
  invokeMock.mockResolvedValue({ playerMode: 'lights' });
  const { loadSettings } = await importSettings();
  expect((await loadSettings()).playerMode).toBe('lights');
});

it('falls back to Video for an unknown player mode', async () => {
  invokeMock.mockResolvedValue({ playerMode: 'audio' });
  const { loadSettings } = await importSettings();
  expect((await loadSettings()).playerMode).toBe('video');
});

it('clamps offsets to ±1000 ms in 10 ms steps', async () => {
  const { clampOffset } = await importSettings();
  expect([1500, -1500, 344, 346, 0].map(clampOffset)).toEqual([
    1000, -1000, 340, 350, 0,
  ]);
});

it('clamps saved follow offsets and drops invalid ones', async () => {
  invokeMock.mockResolvedValue({
    followOffsets: { tv1: 1500, tv2: 'x', tv3: 343 },
    followChoices: { i1: 'p1', i2: 5 },
  });
  const { loadSettings } = await importSettings();
  expect(await loadSettings()).toMatchObject({
    followOffsets: { tv1: 1000, tv3: 340 },
    followChoices: { i1: 'p1' },
  });
});

it('falls back to empty follow maps when they are not records', async () => {
  invokeMock.mockResolvedValue({ followOffsets: [1], followChoices: 'x' });
  const { loadSettings } = await importSettings();
  const { followOffsets, followChoices } = await loadSettings();
  expect({ followOffsets, followChoices }).toEqual({
    followOffsets: {},
    followChoices: {},
  });
});
