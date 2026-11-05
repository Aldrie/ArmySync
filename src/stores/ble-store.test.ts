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

it('persists delays for two devices and re-applies the latest on reconnect', async () => {
  vi.useFakeTimers();
  try {
    invokeMock.mockResolvedValue(null);
    const { useBleStore, emit } = await loadStore();
    const dev2 = { ...dev1, id: 'dev2' };
    emit('ble-connected', dev1);
    emit('ble-connected', dev2);
    await vi.waitFor(() =>
      expect(useBleStore.getState().connectedDevices).toHaveLength(2),
    );
    useBleStore.getState().setDeviceDelay('dev1', 60);
    await vi.advanceTimersByTimeAsync(300);
    useBleStore.getState().setDeviceDelay('dev2', 30);
    await vi.advanceTimersByTimeAsync(300);
    const writes = invokeMock.mock.calls.filter(
      ([cmd]) => cmd === 'write_app_json',
    );
    expect(writes[writes.length - 1]?.[1]).toEqual({
      name: 'settings',
      value: { bleDelays: { dev1: 60, dev2: 30 }, remoteLatencyMs: 0 },
    });

    emit('ble-disconnected', { id: 'dev1' });
    invokeMock.mockClear();
    emit('ble-connected', dev1);
    await vi.waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith('ble_set_device_delay', {
        deviceId: 'dev1',
        delayMs: 60,
      }),
    );
  } finally {
    vi.useRealTimers();
  }
});
