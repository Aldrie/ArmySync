import {
  Bluetooth,
  Loader2,
  Radio,
  Search,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Unplug,
  Wifi,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';

import Modal from './modal';
import type { BleDevice, ConnectedDevice } from '../stores/ble-store';
import { useBleStore } from '../stores/ble-store';

function rssiIcon(rssi: number) {
  if (rssi >= -50) return <SignalHigh className="size-3.5 text-primary" />;
  if (rssi >= -70)
    return <SignalMedium className="size-3.5 text-on-surface-variant" />;
  return <SignalLow className="size-3.5 text-on-surface-variant/50" />;
}

function rssiLabel(rssi: number) {
  if (rssi >= -50) return 'Strong';
  if (rssi >= -70) return 'Medium';
  return 'Weak';
}

function isConnected(deviceId: string, connected: ConnectedDevice[]) {
  return connected.some((d) => d.id === deviceId);
}

interface DeviceRowProps {
  device: BleDevice;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function DeviceRow({
  device,
  connected,
  onConnect,
  onDisconnect,
}: DeviceRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-high/50 transition-colors">
      <Bluetooth
        className={`size-4 shrink-0 ${connected ? 'text-primary' : 'text-on-surface-variant'}`}
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-on-surface truncate">
          {device.name}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
          <span>{device.deviceType}</span>
          <span className="flex items-center gap-0.5">
            {rssiIcon(device.rssi)}
            {rssiLabel(device.rssi)}
          </span>
        </div>
      </div>

      {connected ? (
        <button
          type="button"
          onClick={onDisconnect}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20 transition-colors cursor-pointer"
        >
          <Unplug className="size-3" />
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <Wifi className="size-3" />
          Connect
        </button>
      )}
    </div>
  );
}

export default function DevicesModal() {
  const open = useBleStore((s) => s.showDevicesModal);
  const setOpen = useBleStore((s) => s.setShowDevicesModal);
  const scanning = useBleStore((s) => s.scanning);
  const devices = useBleStore((s) => s.devices);
  const connectedDevices = useBleStore((s) => s.connectedDevices);
  const scan = useBleStore((s) => s.scan);
  const stopScan = useBleStore((s) => s.stopScan);
  const connect = useBleStore((s) => s.connect);
  const disconnect = useBleStore((s) => s.disconnect);

  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (open && !scanning) {
      void scan();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleScan = useCallback(() => {
    if (scanning) {
      void stopScan();
    } else {
      void scan();
    }
  }, [scanning, scan, stopScan]);

  const handleConnect = useCallback(
    (deviceId: string) => () => {
      void connect(deviceId);
    },
    [connect],
  );

  const handleDisconnect = useCallback(
    (deviceId: string) => () => {
      void disconnect(deviceId);
    },
    [disconnect],
  );

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="w-sm max-h-112 rounded-xl border border-outline-variant bg-surface-container shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <Radio className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-on-surface font-display">
              BLE Devices
            </h2>
          </div>

          <button
            type="button"
            onClick={handleToggleScan}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-high hover:bg-surface-highest transition-colors cursor-pointer"
          >
            {scanning ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Stop
              </>
            ) : (
              <>
                <Search className="size-3" />
                Scan
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-0">
          {connectedDevices.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Connected
              </div>
              {connectedDevices.map((d) => {
                const scanned = devices.find((s) => s.id === d.id);
                const deviceInfo: BleDevice = scanned ?? {
                  id: d.id,
                  name: d.name,
                  rssi: 0,
                  deviceType: d.deviceType,
                };
                return (
                  <DeviceRow
                    key={d.id}
                    device={deviceInfo}
                    connected
                    onConnect={() => {}}
                    onDisconnect={handleDisconnect(d.id)}
                  />
                );
              })}
            </div>
          )}

          {devices.filter((d) => !isConnected(d.id, connectedDevices)).length >
            0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Available
              </div>
              {devices
                .filter((d) => !isConnected(d.id, connectedDevices))
                .map((d) => (
                  <DeviceRow
                    key={d.id}
                    device={d}
                    connected={false}
                    onConnect={handleConnect(d.id)}
                    onDisconnect={() => {}}
                  />
                ))}
            </div>
          )}

          {devices.length === 0 && !scanning && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-on-surface-variant">
              <Bluetooth className="size-8 opacity-30" />
              <span className="text-xs">No devices found</span>
              <span className="text-[10px]">
                Tap Scan to search for lightsticks
              </span>
            </div>
          )}

          {devices.length === 0 && scanning && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-on-surface-variant">
              <Loader2 className="size-6 animate-spin opacity-40" />
              <span className="text-xs">Scanning for devices...</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
