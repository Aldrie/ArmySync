import { Bluetooth, BluetoothOff, ChevronRight } from 'lucide-react';
import type { RefObject } from 'react';
import { useCallback, useRef } from 'react';

import Slider from '../../../components/slider';
import { Lightstick } from '../../../domains/lightstick';
import type { LightstickRef } from '../../../domains/lightstick';
import { cn } from '../../../lib/cn';
import { useBleStore } from '../../../stores/ble-store';
import { useTransientTime } from '../../../stores/use-transient-time';

const FRAME_RATE = 24;

interface LightstickPanelProps {
  lightstickRef: RefObject<LightstickRef | null>;
}

export default function LightstickPanel({
  lightstickRef,
}: LightstickPanelProps) {
  const frameRef = useRef<HTMLSpanElement>(null);

  const syncEnabled = useBleStore((s) => s.syncEnabled);
  const setSyncEnabled = useBleStore((s) => s.setSyncEnabled);
  const connectedDevices = useBleStore((s) => s.connectedDevices);
  const setDeviceDelay = useBleStore((s) => s.setDeviceDelay);
  const setShowDevicesModal = useBleStore((s) => s.setShowDevicesModal);

  const deviceCount = connectedDevices.length;
  const hasDevices = deviceCount > 0;

  useTransientTime((time) => {
    if (frameRef.current) {
      frameRef.current.textContent = `Frame ${Math.floor(time * FRAME_RATE)}`;
    }
  });

  const handleDelayChange = useCallback(
    (deviceId: string) => (ms: number) => setDeviceDelay(deviceId, ms),
    [setDeviceDelay],
  );

  return (
    <div className="h-full bg-surface-low border-l border-border flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-xs font-semibold text-on-surface">Preview</h2>
        <span ref={frameRef} className="text-[11px] text-outline tabular-nums">
          Frame 0
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="shrink min-h-0 origin-center scale-60">
          <Lightstick ref={lightstickRef} />
        </div>
      </div>

      <section className="flex flex-col gap-3 w-full border-t border-border p-4">
        <div className="flex items-center justify-between">
          <span
            id="ble-sync-label"
            className="text-xs font-semibold text-on-surface"
          >
            Bluetooth sync
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={syncEnabled}
            aria-labelledby="ble-sync-label"
            onClick={() => setSyncEnabled(!syncEnabled)}
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]',
              syncEnabled ? 'bg-primary' : 'bg-surface-highest',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-200 ease-out',
                syncEnabled && 'translate-x-4',
              )}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDevicesModal(true)}
          className="group flex items-center gap-3 w-full p-2.5 rounded-lg border border-border bg-surface-container shadow-raised text-left hover:bg-surface-high hover:border-border-strong transition-colors cursor-pointer"
        >
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md',
              hasDevices
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-high text-on-surface-variant',
            )}
          >
            {hasDevices ? (
              <Bluetooth className="size-4" />
            ) : (
              <BluetoothOff className="size-4" />
            )}
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-[13px] font-medium text-on-surface truncate">
              {hasDevices
                ? `${deviceCount} device${deviceCount > 1 ? 's' : ''}`
                : 'No Device'}
            </span>
            <span className="text-[11px] text-on-surface-variant truncate">
              {hasDevices
                ? connectedDevices.map((d) => d.name).join(', ')
                : 'Tap to connect'}
            </span>
          </div>
          <ChevronRight className="size-4 shrink-0 text-outline transition-transform group-hover:translate-x-0.5" />
        </button>

        {connectedDevices.map((device) => (
          <div key={device.id} className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-on-surface-variant truncate">
                {device.name}
              </span>
              <span className="text-xs font-medium text-on-surface tabular-nums">
                {device.delayMs}ms
              </span>
            </div>
            <Slider
              min={0}
              max={200}
              step={1}
              defaultValue={device.delayMs}
              aria-label={`${device.name} latency`}
              className="w-full"
              onChange={handleDelayChange(device.id)}
            />
          </div>
        ))}

        {hasDevices && (
          <span className="text-[11px] text-outline">
            Compensate Bluetooth latency per device
          </span>
        )}
      </section>
    </div>
  );
}
