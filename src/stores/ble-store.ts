import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { clampDelay, loadSettings, updateSettings } from '../lib/settings';

export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
  deviceType: string | null;
}

export interface DeviceInfo {
  id: string;
  name: string;
  deviceType: string;
}

export interface ConnectedDevice extends DeviceInfo {
  delayMs: number;
}

export interface ColorTest {
  deviceId: string;
  failed: boolean;
}

export const TEST_COLOR: [number, number, number] = [0x8b, 0x20, 0xbd];
const IDENTIFY_BLINKS = 3;
const IDENTIFY_STEP_MS = 280;
const REDISCOVER_MS = 10_000;

interface BleState {
  syncEnabled: boolean;
  connectedDevices: ConnectedDevice[];
  scanning: boolean;
  devices: BleDevice[];
  showDevicesModal: boolean;
  colorTest: ColorTest | null;
  dropped: DeviceInfo[];
  connectError: string | null;
  connecting: string[];

  setSyncEnabled: (enabled: boolean) => void;
  setDeviceDelay: (deviceId: string, ms: number) => void;
  setShowDevicesModal: (open: boolean) => void;
  scan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: (deviceId: string) => Promise<void>;
  answerColorTest: (lit: boolean) => void;
  retryColorTest: () => void;
  identify: (deviceId: string) => Promise<void>;
  forgetDropped: (deviceId: string) => void;
  reconnect: (deviceId: string) => Promise<void>;
  closeNotices: () => void;
}

let pendingDelays: Record<string, number> = {};
let persistTimer: ReturnType<typeof setTimeout> | undefined;

const persistDelay = (deviceId: string, delayMs: number) => {
  pendingDelays = { ...pendingDelays, [deviceId]: delayMs };
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const delays = pendingDelays;
    pendingDelays = {};
    void loadSettings().then(({ bleDelays }) =>
      updateSettings({ bleDelays: { ...bleDelays, ...delays } }),
    );
  }, 300);
};

const connectTokens = new Map<string, symbol>();

const hold = (deviceId: string, color: [number, number, number] | null) =>
  invoke('ble_hold', { deviceId, color }).catch((err: unknown) =>
    console.error('[ble] hold failed:', err),
  );

const removeDevice = (deviceId: string) => {
  connectTokens.delete(deviceId);
  useBleStore.setState((state) => ({
    connectedDevices: state.connectedDevices.filter((d) => d.id !== deviceId),
    colorTest: state.colorTest?.deviceId === deviceId ? null : state.colorTest,
  }));
};

export function nearbyDevices(
  devices: BleDevice[],
  connected: ConnectedDevice[],
  showUnlisted: boolean,
) {
  return devices.filter(
    (d) =>
      !connected.some((c) => c.id === d.id) &&
      (showUnlisted || d.deviceType !== null),
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useBleStore = create<BleState>((set, get) => ({
  syncEnabled: false,
  connectedDevices: [],
  scanning: false,
  devices: [],
  showDevicesModal: false,
  colorTest: null,
  dropped: [],
  connectError: null,
  connecting: [],

  setSyncEnabled: (enabled) => {
    set({ syncEnabled: enabled });
  },

  setDeviceDelay: (deviceId, ms) => {
    const clamped = clampDelay(ms);
    set((state) => ({
      connectedDevices: state.connectedDevices.map((d) =>
        d.id === deviceId ? { ...d, delayMs: clamped } : d,
      ),
    }));
    void invoke('ble_set_device_delay', { deviceId, delayMs: clamped });
    persistDelay(deviceId, clamped);
  },

  setShowDevicesModal: (open) => {
    set({ showDevicesModal: open });
    if (!open) get().closeNotices();
    if (!open && get().scanning) {
      void invoke('ble_stop_scan');
      set({ scanning: false });
    }
  },

  scan: async () => {
    set({ scanning: true, devices: [] });
    try {
      await invoke('ble_scan');
    } catch (err) {
      console.error('[ble] scan failed:', err);
    } finally {
      set({ scanning: false });
    }
  },

  stopScan: async () => {
    try {
      await invoke('ble_stop_scan');
    } catch (err) {
      console.error('[ble] stop scan failed:', err);
    }
    set({ scanning: false });
  },

  connect: async (deviceId) => {
    if (get().connecting.includes(deviceId)) return;
    set((state) => ({
      connectError: null,
      connecting: [...state.connecting, deviceId],
    }));
    try {
      await invoke('ble_connect', { deviceId });
    } catch (err) {
      set({ connectError: String(err) });
    } finally {
      set((state) => ({
        connecting: state.connecting.filter((id) => id !== deviceId),
      }));
    }
  },

  reconnect: async (deviceId) => {
    if (get().connecting.includes(deviceId)) return;
    if (!get().devices.some((d) => d.id === deviceId)) {
      set((state) => ({ connecting: [...state.connecting, deviceId] }));
      if (!get().scanning) void get().scan();
      await new Promise<void>((resolve) => {
        const timer = setTimeout(done, REDISCOVER_MS);
        const unsubscribe = useBleStore.subscribe((state) => {
          if (state.devices.some((d) => d.id === deviceId)) done();
        });
        function done() {
          clearTimeout(timer);
          unsubscribe();
          resolve();
        }
      });
      set((state) => ({
        connecting: state.connecting.filter((id) => id !== deviceId),
      }));
    }
    await get().connect(deviceId);
  },

  closeNotices: () => {
    const test = get().colorTest;
    set({ colorTest: null, connectError: null });
    if (test) void hold(test.deviceId, null);
  },

  disconnect: async (deviceId) => {
    try {
      await invoke('ble_disconnect', { deviceId });
    } catch (err) {
      console.error('[ble] disconnect failed:', err);
    }
    removeDevice(deviceId);
  },

  answerColorTest: (lit) => {
    const test = get().colorTest;
    if (!test) return;
    if (lit) {
      set({ colorTest: null });
      void hold(test.deviceId, null);
    } else {
      set({ colorTest: { ...test, failed: true } });
    }
  },

  retryColorTest: () => {
    const test = get().colorTest;
    if (!test) return;
    set({ colorTest: { ...test, failed: false } });
    void hold(test.deviceId, TEST_COLOR);
  },

  identify: async (deviceId) => {
    for (let i = 0; i < IDENTIFY_BLINKS * 2; i++) {
      await hold(deviceId, i % 2 === 0 ? [255, 255, 255] : [0, 0, 0]);
      await wait(IDENTIFY_STEP_MS);
    }
    const test = get().colorTest;
    await hold(deviceId, test?.deviceId === deviceId ? TEST_COLOR : null);
  },

  forgetDropped: (deviceId) => {
    set((state) => ({
      dropped: state.dropped.filter((d) => d.id !== deviceId),
    }));
  },
}));

void listen<BleDevice[]>('ble-devices', (event) => {
  useBleStore.setState({ devices: event.payload });
});

const addConnectedDevice = async (payload: ConnectedDevice) => {
  const token = Symbol(payload.id);
  connectTokens.set(payload.id, token);
  const { bleDelays } = await loadSettings();
  if (connectTokens.get(payload.id) !== token) return;
  connectTokens.delete(payload.id);
  const { connectedDevices } = useBleStore.getState();
  if (connectedDevices.some((d) => d.id === payload.id)) return;
  const device = { ...payload, delayMs: bleDelays[payload.id] ?? 0 };
  const previousTest = useBleStore.getState().colorTest;
  if (previousTest) void hold(previousTest.deviceId, null);
  useBleStore.setState((state) => ({
    connectedDevices: [...state.connectedDevices, device],
    dropped: state.dropped.filter((d) => d.id !== device.id),
    colorTest: { deviceId: device.id, failed: false },
    scanning: false,
  }));
  void hold(device.id, TEST_COLOR);
  if (device.delayMs > 0) {
    try {
      await invoke('ble_set_device_delay', {
        deviceId: device.id,
        delayMs: device.delayMs,
      });
    } catch (err) {
      console.error('[ble] set device delay failed:', err);
    }
  }
};

void listen<ConnectedDevice>('ble-connected', (event) => {
  void addConnectedDevice(event.payload);
});

void listen<{ id: string }>('ble-disconnected', (event) => {
  removeDevice(event.payload.id);
});

void listen<DeviceInfo>('ble-dropped', (event) => {
  const device = event.payload;
  removeDevice(device.id);
  useBleStore.setState((state) => ({
    dropped: [...state.dropped.filter((d) => d.id !== device.id), device],
  }));
});
