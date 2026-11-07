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
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { BleNotices, UnlistedButton } from './ble-notices';
import Button from './button';
import IconButton from './icon-button';
import Modal from './modal';
import { cn } from '../lib/cn';
import type { BleDevice } from '../stores/ble-store';
import { nearbyDevices, useBleStore } from '../stores/ble-store';

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

interface DeviceRowProps {
  device: BleDevice;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function DeviceRow({
  device,
  connected,
  onConnect,
  onDisconnect,
}: DeviceRowProps) {
  const identify = useBleStore((s) => s.identify);
  const connecting = useBleStore((s) => s.connecting.includes(device.id));

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-high/60">
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border',
          connected
            ? 'bg-primary/10 text-primary'
            : 'bg-surface-high text-on-surface-variant',
        )}
      >
        <Bluetooth className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-on-surface">
          {device.name || 'Unnamed device'}
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span>{device.deviceType ?? 'Unknown'}</span>
          {device.rssi !== 0 && (
            <span className="flex items-center gap-1">
              {rssiIcon(device.rssi)}
              {rssiLabel(device.rssi)}
            </span>
          )}
        </div>
      </div>

      {connected ? (
        <>
          <IconButton
            label="Identify: blink this lightstick"
            onClick={() => void identify(device.id)}
          >
            <Zap />
          </IconButton>
          <Button intent="danger" size="sm" onClick={onDisconnect}>
            <Unplug />
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          intent="tonal"
          size="sm"
          disabled={connecting}
          onClick={onConnect}
        >
          {connecting ? <Loader2 className="animate-spin" /> : <Wifi />}
          {connecting ? 'Connecting' : 'Connect'}
        </Button>
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
  const [showUnlisted, setShowUnlisted] = useState(false);
  const nearby = nearbyDevices(devices, connectedDevices, showUnlisted);

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
    <Modal
      open={open}
      onClose={handleClose}
      labelledBy="devices-modal-title"
      className="flex max-h-112 w-sm flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Radio className="size-4 text-primary" />
            <h2
              id="devices-modal-title"
              className="font-display text-base font-bold tracking-tight text-on-surface"
            >
              BLE Devices
            </h2>
          </div>

          <Button size="sm" onClick={handleToggleScan}>
            {scanning ? (
              <>
                <Loader2 className="animate-spin" />
                Stop
              </>
            ) : (
              <>
                <Search />
                Scan
              </>
            )}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <BleNotices />
          {connectedDevices.length > 0 && (
            <div className="mb-2">
              <div className="px-3 pt-2 pb-1 text-xs font-semibold text-on-surface-variant">
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

          {nearby.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-xs font-semibold text-on-surface-variant">
                Available
              </div>
              {nearby.map((d) => (
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

          {nearby.length === 0 && !scanning && (
            <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-surface-high text-on-surface-variant">
                <Bluetooth className="size-5" />
              </div>
              <span className="text-sm font-medium text-on-surface">
                No devices found
              </span>
              <span className="text-xs text-on-surface-variant">
                Tap Scan to search for lightsticks
              </span>
            </div>
          )}

          {nearby.length === 0 && scanning && (
            <div
              role="status"
              className="flex flex-col items-center justify-center gap-3 py-10 text-on-surface-variant"
            >
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">Scanning for devices...</span>
            </div>
          )}

          {devices.length > 0 && (
            <UnlistedButton
              showUnlisted={showUnlisted}
              onToggle={() => setShowUnlisted((v) => !v)}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
