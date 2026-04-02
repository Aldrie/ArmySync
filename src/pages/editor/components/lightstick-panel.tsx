import type { RefObject } from 'react';

import { Lightstick } from '../../../domains/lightstick';
import type { LightstickRef } from '../../../domains/lightstick';

interface LightstickPanelProps {
  lightstickRef: RefObject<LightstickRef | null>;
  currentTime: number;
}

export default function LightstickPanel({
  lightstickRef,
  currentTime,
}: LightstickPanelProps) {
  const currentFrame = Math.floor(currentTime * 24);

  return (
    <div className="h-full bg-surface-container flex flex-col items-center justify-center gap-4 py-6 px-4">
      <div className="scale-60 origin-center">
        <Lightstick ref={lightstickRef} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="font-display font-bold text-[10px] tracking-widest uppercase text-on-surface-variant">
          Live Feed
        </span>
        <span className="text-[10px] text-on-surface-variant">
          Syncing with Frame {currentFrame}
        </span>
      </div>
    </div>
  );
}
