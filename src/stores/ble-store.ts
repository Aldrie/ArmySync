import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
  deviceType: string;
}

interface ConnectedDevice {
  id: string;
  name: string;
  deviceType: string;
}

interface BleState {
  syncEnabled: boolean;
  delayMs: number;
  connectedDevice: ConnectedDevice | null;
  scanning: boolean;
  devices: BleDevice[];
  showDevicesModal: boolean;

  setSyncEnabled: (enabled: boolean) => void;
  setDelayMs: (ms: number) => void;
  setShowDevicesModal: (open: boolean) => void;
  scan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useBleStore = create<BleState>((set, get) => ({
  syncEnabled: false,
  delayMs: 0,
  connectedDevice: null,
  scanning: false,
  devices: [],
  showDevicesModal: false,

  setSyncEnabled: (enabled) => {
    set({ syncEnabled: enabled });
  },

  setDelayMs: (ms) => {
    const clamped = Math.max(0, Math.min(200, ms));
    set({ delayMs: clamped });
    void invoke('sync_set_delay', { delayMs: clamped });
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

  disconnect: async () => {
    try {
      await invoke('ble_disconnect');
    } catch (err) {
      console.error('[ble] disconnect failed:', err);
    }
    set({ connectedDevice: null });
  },
}));

void listen<BleDevice[]>('ble-devices', (event) => {
  useBleStore.setState({ devices: event.payload });
});

void listen<ConnectedDevice | null>('ble-status', (event) => {
  useBleStore.setState({
    connectedDevice: event.payload,
    scanning: false,
  });
});
