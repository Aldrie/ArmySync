import { Upload } from 'lucide-react';
import type { RefObject } from 'react';

import { Lightstick } from '../../../domains/lightstick';
import type { LightstickRef } from '../../../domains/lightstick';

interface LightstickPanelProps {
  lightstickRef: RefObject<LightstickRef | null>;
  currentTime: number;
  onLoadEffectFile: () => void;
}

export default function LightstickPanel({
  lightstickRef,
  currentTime,
  onLoadEffectFile,
}: LightstickPanelProps) {
  const currentFrame = Math.floor(currentTime * 24);

  return (
    <div className="h-full bg-surface-low flex flex-col py-6 px-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0 overflow-hidden">
        <div className="shrink min-h-0 origin-center scale-60">
          <Lightstick ref={lightstickRef} />
        </div>

        <div className="flex flex-col items-center gap-1 my-4">
          <span className="font-display font-bold text-[10px] tracking-widest uppercase text-on-surface-variant">
            Live Feed
          </span>
          <span className="text-[10px] text-on-surface-variant">
            Syncing with Frame {currentFrame}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <button
          type="button"
          className="w-full py-2.5 rounded-md font-display font-bold text-sm text-on-primary cursor-pointer transition-opacity hover:opacity-90"
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))',
          }}
          onClick={onLoadEffectFile}
        >
          Sync Lightstick
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer py-1.5"
          onClick={onLoadEffectFile}
        >
          <Upload size={12} />
          Load from file
        </button>
      </div>
    </div>
  );
}
