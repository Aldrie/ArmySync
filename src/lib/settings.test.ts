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
  expect(await loadSettings()).toEqual({ bleDelays: {} });
});

it('clamps saved delays and ignores non-numeric entries', async () => {
  invokeMock.mockResolvedValue({
    bleDelays: { a: 500, b: -10, c: 'x', d: 60 },
  });
  const { loadSettings } = await importSettings();
  expect((await loadSettings()).bleDelays).toEqual({ a: 200, b: 0, d: 60 });
});

it('merges a patch while keeping other stored keys', async () => {
  invokeMock.mockResolvedValueOnce({ theme: 'dark', bleDelays: { b: 10 } });
  const { updateSettings } = await importSettings();
  await updateSettings({ bleDelays: { a: 40 } });
  expect(writes()).toHaveLength(1);
  expect(writes()[0][1]).toEqual({
    name: 'settings',
    value: { theme: 'dark', bleDelays: { a: 40 } },
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
    { name: 'settings', value: { theme: 'dark', bleDelays: { a: 40 } } },
    { name: 'settings', value: { theme: 'dark', bleDelays: { a: 40, b: 10 } } },
  ]);
});

it('never writes after a failed read', async () => {
  invokeMock.mockRejectedValueOnce(new Error('disk'));
  const { loadSettings, updateSettings } = await importSettings();
  expect(await loadSettings()).toEqual({ bleDelays: {} });
  await updateSettings({ bleDelays: { a: 40 } });
  expect(writes()).toHaveLength(0);
});
