import { Bluetooth } from 'lucide-react';

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
        <Lightstick model="se" height={height} off={!!onConnect} />
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
