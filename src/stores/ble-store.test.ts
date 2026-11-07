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
      value: {
        bleDelays: { dev1: 60, dev2: 30 },
        remoteLatencyMs: 0,
        playerMode: 'video',
        followOffsets: {},
        followChoices: {},
      },
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

const purple = [0x8b, 0x20, 0xbd];

it('shows the test color on connect and goes back to the show once confirmed', async () => {
  invokeMock.mockResolvedValue(null);
  const { useBleStore, emit } = await loadStore();
  emit('ble-connected', dev1);
  await vi.waitFor(() =>
    expect(invokeMock).toHaveBeenCalledWith('ble_hold', {
      deviceId: 'dev1',
      color: purple,
    }),
  );
  expect(useBleStore.getState().colorTest).toEqual({
    deviceId: 'dev1',
    failed: false,
  });

  useBleStore.getState().answerColorTest(false);
  expect(useBleStore.getState().colorTest?.failed).toBe(true);
  expect(invokeMock).not.toHaveBeenCalledWith('ble_hold', {
    deviceId: 'dev1',
    color: null,
  });

  useBleStore.getState().retryColorTest();
  expect(useBleStore.getState().colorTest?.failed).toBe(false);
  useBleStore.getState().answerColorTest(true);
  expect(useBleStore.getState().colorTest).toBeNull();
  expect(invokeMock).toHaveBeenLastCalledWith('ble_hold', {
    deviceId: 'dev1',
    color: null,
  });
});

it('keeps a dropped device to reconnect and clears it once it is back', async () => {
  invokeMock.mockResolvedValue(null);
  const { useBleStore, emit } = await loadStore();
  emit('ble-connected', dev1);
  await vi.waitFor(() =>
    expect(useBleStore.getState().connectedDevices).toHaveLength(1),
  );

  const info = { id: 'dev1', name: 'Lightstick', deviceType: 'v4' };
  emit('ble-dropped', info);
  expect(useBleStore.getState().connectedDevices).toEqual([]);
  expect(useBleStore.getState().colorTest).toBeNull();
  expect(useBleStore.getState().dropped).toEqual([info]);

  emit('ble-dropped', info);
  expect(useBleStore.getState().dropped).toHaveLength(1);

  emit('ble-connected', dev1);
  await vi.waitFor(() =>
    expect(useBleStore.getState().connectedDevices).toHaveLength(1),
  );
  expect(useBleStore.getState().dropped).toEqual([]);
});

it('shows why a connect failed and clears it on the next try', async () => {
  invokeMock.mockRejectedValueOnce("That device isn't a BTS lightstick");
  const { useBleStore } = await loadStore();
  await useBleStore.getState().connect('dev9');
  expect(useBleStore.getState().connectError).toBe(
    "That device isn't a BTS lightstick",
  );
  invokeMock.mockResolvedValue(null);
  await useBleStore.getState().connect('dev1');
  expect(useBleStore.getState().connectError).toBeNull();
});

it('hides unknown devices unless asked and never lists connected ones', async () => {
  const { nearbyDevices } = await import('./ble-store');
  const stick = { id: 'a', name: 'BTS_V4 LS', rssi: -40, deviceType: 'v4' };
  const other = { id: 'b', name: '', rssi: -60, deviceType: null };
  const linked = { id: 'c', name: 'SE', rssi: -50, deviceType: 'se' };
  const connected = [{ ...linked, delayMs: 0 }];
  const all = [stick, other, linked];
  expect(nearbyDevices(all, connected, false)).toEqual([stick]);
  expect(nearbyDevices(all, connected, true)).toEqual([stick, other]);
});

it('releases the stick under test when another connects or the list closes', async () => {
  invokeMock.mockResolvedValue(null);
  const { useBleStore, emit } = await loadStore();
  emit('ble-connected', dev1);
  await vi.waitFor(() =>
    expect(useBleStore.getState().colorTest?.deviceId).toBe('dev1'),
  );
  emit('ble-connected', { ...dev1, id: 'dev2' });
  await vi.waitFor(() =>
    expect(useBleStore.getState().colorTest?.deviceId).toBe('dev2'),
  );
  expect(invokeMock).toHaveBeenCalledWith('ble_hold', {
    deviceId: 'dev1',
    color: null,
  });

  useBleStore.getState().closeNotices();
  expect(useBleStore.getState().colorTest).toBeNull();
  expect(invokeMock).toHaveBeenLastCalledWith('ble_hold', {
    deviceId: 'dev2',
    color: null,
  });
});

it('ignores a second connect for a device that is already connecting', async () => {
  let finish: (value: unknown) => void = () => {};
  invokeMock.mockImplementation(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const { useBleStore } = await loadStore();
  const first = useBleStore.getState().connect('dev1');
  void useBleStore.getState().connect('dev1');
  expect(useBleStore.getState().connecting).toEqual(['dev1']);
  expect(invokeMock).toHaveBeenCalledTimes(1);
  finish(null);
  await first;
  expect(useBleStore.getState().connecting).toEqual([]);
});
