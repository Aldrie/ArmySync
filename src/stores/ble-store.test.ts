import { beforeEach, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

const invokeMock = vi.mocked(invoke);
const listenMock = vi.mocked(listen);

const loadStore = async () => {
  const { useBleStore } = await import('./ble-store');
  const emit = (name: string, payload: unknown) => {
    const call = listenMock.mock.calls.find(([event]) => event === name);
    if (!call) throw new Error(`No listener for ${name}`);
    void call[1]({ event: name, id: 0, payload });
  };
  return { useBleStore, emit };
};

const dev1 = { id: 'dev1', name: 'Lightstick', deviceType: 'v4', delayMs: 0 };

beforeEach(() => {
  vi.resetModules();
  invokeMock.mockReset();
  listenMock.mockReset();
  listenMock.mockResolvedValue(() => {});
});

it('connects a device with its saved delay', async () => {
  invokeMock.mockImplementation((cmd) =>
    Promise.resolve(
      cmd === 'read_app_json' ? { bleDelays: { dev1: 60 } } : undefined,
    ),
  );
  const { useBleStore, emit } = await loadStore();
  emit('ble-connected', dev1);
  await vi.waitFor(() =>
    expect(useBleStore.getState().connectedDevices).toEqual([
      { ...dev1, delayMs: 60 },
    ]),
  );
  expect(invokeMock).toHaveBeenCalledWith('ble_set_device_delay', {
    deviceId: 'dev1',
    delayMs: 60,
  });
});

it('drops a device that disconnects while settings load', async () => {
  let finishRead: (value: unknown) => void = () => {};
  invokeMock.mockImplementation((cmd) =>
    cmd === 'read_app_json'
      ? new Promise((resolve) => (finishRead = resolve))
      : Promise.resolve(),
  );
  const { useBleStore, emit } = await loadStore();
  emit('ble-connected', dev1);
  emit('ble-disconnected', { id: 'dev1' });
  finishRead(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(useBleStore.getState().connectedDevices).toEqual([]);
});

it('ignores a duplicate connect event', async () => {
  invokeMock.mockResolvedValue(null);
  const { useBleStore, emit } = await loadStore();
  emit('ble-connected', dev1);
  await vi.waitFor(() =>
    expect(useBleStore.getState().connectedDevices).toHaveLength(1),
  );
  emit('ble-connected', dev1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(useBleStore.getState().connectedDevices).toHaveLength(1);
});
