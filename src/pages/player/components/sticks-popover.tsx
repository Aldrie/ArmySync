import { Bluetooth, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';

import PlayerPopover from './player-popover';
import { DeviceRow } from '../../../components/devices-modal';
import IconButton from '../../../components/icon-button';
import { useBleStore } from '../../../stores/ble-store';

export const STICKS_POPOVER_ID = 'player-sticks';

export default function SticksPopover() {
  const devices = useBleStore((s) => s.devices);
  const connectedDevices = useBleStore((s) => s.connectedDevices);
  const { scan, stopScan, connect, disconnect } = useBleStore.getState();
  const nearby = devices.filter(
    (d) => !connectedDevices.some((c) => c.id === d.id),
  );
  const count = connectedDevices.length;
  const openRef = useRef(false);

  // A popover removed from the DOM while open closes without a toggle event.
  useEffect(
    () => () => {
      if (openRef.current) void useBleStore.getState().stopScan();
    },
    [],
  );

  const handleOpenChange = (open: boolean) => {
    openRef.current = open;
    void (open ? scan() : stopScan());
  };

  return (
    <PlayerPopover
      id={STICKS_POPOVER_ID}
      label={`Lightsticks, ${count} connected`}
      heading="Lightsticks"
      trigger={
        <>
          <Bluetooth aria-hidden="true" />
          {count > 0 && count}
        </>
      }
      onOpenChange={handleOpenChange}
      className="w-80"
    >
      <div className="flex flex-col gap-0.5 p-2">
        <div className="flex items-center justify-between pt-0.5 pr-0.5 pb-1 pl-2">
          <h2 className="text-[13px] font-semibold">Lightsticks</h2>
          <IconButton label="Scan again" onClick={() => void scan()}>
            <RefreshCw />
          </IconButton>
        </div>
        {connectedDevices.map((d) => (
          <DeviceRow
            key={d.id}
            device={
              devices.find((s) => s.id === d.id) ?? {
                id: d.id,
                name: d.name,
                rssi: 0,
                deviceType: d.deviceType,
              }
            }
            connected
            onConnect={() => undefined}
            onDisconnect={() => void disconnect(d.id)}
          />
        ))}
        {nearby.map((d) => (
          <DeviceRow
            key={d.id}
            device={d}
            connected={false}
            onConnect={() => void connect(d.id)}
            onDisconnect={() => undefined}
          />
        ))}
        <p className="px-2 pt-1.5 pb-1 text-[11px] leading-normal text-outline">
          Turn a lightstick on and keep it near your Mac. The preview shows one
          of each model.
        </p>
      </div>
    </PlayerPopover>
  );
}
