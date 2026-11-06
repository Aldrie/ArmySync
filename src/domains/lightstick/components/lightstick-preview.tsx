import { Bluetooth, BluetoothOff } from 'lucide-react';

import Lightstick from './lightstick';
import { cn } from '../../../lib/cn';
import { useBleStore } from '../../../stores/ble-store';
import { previewModels } from '../preview-models';

interface LightstickPreviewProps {
  height: number;
  onConnect?: () => void;
  className?: string;
}

export default function LightstickPreview({
  height,
  onConnect,
  className,
}: LightstickPreviewProps) {
  const connectedDevices = useBleStore((s) => s.connectedDevices);
  const models = previewModels(connectedDevices);

  if (models.length === 0) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <div className="relative">
          <Lightstick model="se" height={height} />
          <NotConnectedBadge height={height} />
        </div>
        {onConnect && (
          <button
            type="button"
            onClick={onConnect}
            className="flex h-7 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 cursor-pointer"
          >
            <Bluetooth aria-hidden="true" className="size-3.5" />
            Connect a lightstick
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-end justify-center', className)}
      style={{ gap: height * 0.075 }}
    >
      {models.map((model) => (
        <Lightstick key={model} model={model} height={height} />
      ))}
    </div>
  );
}

function NotConnectedBadge({ height }: { height: number }) {
  const size = Math.round(Math.min(32, Math.max(18, height * 0.085)));
  return (
    <span
      role="img"
      aria-label="No lightstick connected"
      title="No lightstick connected"
      className="absolute flex items-center justify-center rounded-full border border-border-strong bg-surface-high text-on-surface-variant shadow-raised"
      style={{
        width: size,
        height: size,
        left: (height * 200) / 446 - size * 0.75,
        top: height * 0.37,
      }}
    >
      <BluetoothOff
        aria-hidden="true"
        style={{ width: size * 0.55, height: size * 0.55 }}
      />
    </span>
  );
}
