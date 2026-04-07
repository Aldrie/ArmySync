import { Bluetooth, BluetoothOff } from 'lucide-react';
import type { RefObject } from 'react';
import { useCallback, useRef } from 'react';

import Slider from '../../../components/slider';
import { Lightstick } from '../../../domains/lightstick';
import type { LightstickRef } from '../../../domains/lightstick';
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
  const delayMs = useBleStore((s) => s.delayMs);
  const setDelayMs = useBleStore((s) => s.setDelayMs);
  const connectedDevice = useBleStore((s) => s.connectedDevice);
  const setShowDevicesModal = useBleStore((s) => s.setShowDevicesModal);

  useTransientTime((time) => {
    if (frameRef.current) {
      frameRef.current.textContent = `Frame ${Math.floor(time * FRAME_RATE)}`;
    }
  });

  const handleDelayChange = useCallback(
    (v: number) => setDelayMs(v),
    [setDelayMs],
  );

  return (
    <div className="h-full bg-surface-low flex flex-col py-5 px-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0 overflow-hidden">
        <div className="shrink min-h-0 origin-center scale-60">
          <Lightstick ref={lightstickRef} />
        </div>

        <div className="flex flex-col items-center gap-1 mt-2">
          <span className="font-display font-bold text-[10px] tracking-widest uppercase text-on-surface-variant">
            Live Preview
          </span>
          <span
            ref={frameRef}
            className="text-[10px] text-on-surface-variant tabular-nums font-mono"
          >
            Frame 0
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        {/* Sync toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-bold text-on-surface-variant uppercase tracking-wider">
            BLE Sync
          </span>
          <button
            type="button"
            onClick={() => setSyncEnabled(!syncEnabled)}
            className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
              syncEnabled ? 'bg-primary' : 'bg-surface-highest'
            }`}
          >
            <span
              className={`absolute top-0.75 left-0.75 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                syncEnabled ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Device selector */}
        <button
          type="button"
          onClick={() => setShowDevicesModal(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container hover:border-primary/40 transition-colors cursor-pointer"
        >
          {connectedDevice ? (
            <Bluetooth className="size-4 text-primary shrink-0" />
          ) : (
            <BluetoothOff className="size-4 text-on-surface-variant shrink-0" />
          )}
          <div className="flex flex-col items-start min-w-0">
            <span className="text-xs font-display font-bold text-on-surface truncate">
              {connectedDevice?.name ?? 'No Device'}
            </span>
            <span className="text-[10px] text-on-surface-variant">
              {connectedDevice ? connectedDevice.deviceType : 'Tap to connect'}
            </span>
          </div>
        </button>

        {/* Delay compensation */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">BLE Delay</span>
            <span className="text-xs text-on-surface font-mono tabular-nums">
              {delayMs}ms
            </span>
          </div>
          <Slider
            min={0}
            max={200}
            step={1}
            defaultValue={delayMs}
            variant="fill"
            className="w-full h-1.5 rounded-sm"
            onChange={handleDelayChange}
          />
          <span className="text-[10px] text-on-surface-variant">
            Compensate Bluetooth latency
          </span>
        </div>
      </div>
    </div>
  );
}
