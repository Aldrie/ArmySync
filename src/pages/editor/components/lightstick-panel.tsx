import { Bluetooth, BluetoothOff, ChevronRight } from 'lucide-react';
import type { RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';

import PanelSectionHeader from './panel-section-header';
import Slider from '../../../components/slider';
import Switch from '../../../components/switch';
import { Lightstick } from '../../../domains/lightstick';
import type { LightstickRef } from '../../../domains/lightstick';
import { cn } from '../../../lib/cn';
import { useBleStore } from '../../../stores/ble-store';
import { useTransientTime } from '../../../stores/use-transient-time';
import RemoteSection from '../remote/remote-section';

const FRAME_RATE = 24;

interface LightstickPanelProps {
  lightstickRef: RefObject<LightstickRef | null>;
}

export default function LightstickPanel({
  lightstickRef,
}: LightstickPanelProps) {
  const frameRef = useRef<HTMLSpanElement>(null);
  const [openSection, setOpenSection] = useState<'preview' | 'remote'>(
    'preview',
  );
  const previewOpen = openSection === 'preview';

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
      <PanelSectionHeader
        title="Preview"
        open={previewOpen}
        onToggle={() => setOpenSection(previewOpen ? 'remote' : 'preview')}
        controls="preview-section"
      >
        <span
          ref={frameRef}
          className={cn(
            'text-[11px] text-outline tabular-nums',
            !previewOpen && 'hidden',
          )}
        >
          Frame 0
        </span>
        {!previewOpen && (
          <span
            title={hasDevices ? `${deviceCount} connected` : 'No device'}
            className={hasDevices ? 'text-primary' : 'text-outline'}
          >
            {hasDevices ? (
              <Bluetooth className="size-3.5" />
            ) : (
              <BluetoothOff className="size-3.5" />
            )}
          </span>
        )}
      </PanelSectionHeader>

      <div
        id="preview-section"
        className={cn(
          'flex-1 min-h-0 flex-col',
          previewOpen ? 'flex' : 'hidden',
        )}
      >
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
            <Switch
              checked={syncEnabled}
              onChange={setSyncEnabled}
              labelledBy="ble-sync-label"
            />
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

      {previewOpen && <div className="border-t border-border" />}
      <RemoteSection
        open={!previewOpen}
        onToggle={() => setOpenSection(previewOpen ? 'remote' : 'preview')}
      />
    </div>
  );
}
