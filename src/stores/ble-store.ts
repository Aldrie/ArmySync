import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
  deviceType: string;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  deviceType: string;
  delayMs: number;
}

interface BleState {
  syncEnabled: boolean;
  connectedDevices: ConnectedDevice[];
  scanning: boolean;
  devices: BleDevice[];
  showDevicesModal: boolean;

  setSyncEnabled: (enabled: boolean) => void;
  setDeviceDelay: (deviceId: string, ms: number) => void;
  setShowDevicesModal: (open: boolean) => void;
  scan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: (deviceId: string) => Promise<void>;
}

export const useBleStore = create<BleState>((set, get) => ({
  syncEnabled: false,
  connectedDevices: [],
  scanning: false,
  devices: [],
  showDevicesModal: false,

  setSyncEnabled: (enabled) => {
    set({ syncEnabled: enabled });
  },

  setDeviceDelay: (deviceId, ms) => {
    const clamped = Math.max(0, Math.min(200, ms));
    set((state) => ({
      connectedDevices: state.connectedDevices.map((d) =>
        d.id === deviceId ? { ...d, delayMs: clamped } : d,
      ),
    }));
    void invoke('ble_set_device_delay', { deviceId, delayMs: clamped });
  },

  setShowDevicesModal: (open) => {
    set({ showDevicesModal: open });
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
    try {
      await invoke('ble_connect', { deviceId });
    } catch (err) {
      console.error('[ble] connect failed:', err);
    }
  },

  disconnect: async (deviceId) => {
    try {
      await invoke('ble_disconnect', { deviceId });
    } catch (err) {
      console.error('[ble] disconnect failed:', err);
    }
    set((state) => ({
      connectedDevices: state.connectedDevices.filter((d) => d.id !== deviceId),
    }));
  },
}));

void listen<BleDevice[]>('ble-devices', (event) => {
  useBleStore.setState({ devices: event.payload });
});

void listen<ConnectedDevice>('ble-connected', (event) => {
  const device = { ...event.payload, delayMs: 0 };
  useBleStore.setState((state) => ({
    connectedDevices: [...state.connectedDevices, device],
    scanning: false,
  }));
});

void listen<{ id: string }>('ble-disconnected', (event) => {
  useBleStore.setState((state) => ({
    connectedDevices: state.connectedDevices.filter(
      (d) => d.id !== event.payload.id,
    ),
  }));
});
