import { Timer } from 'lucide-react';
import { useEffect, useRef } from 'react';

import PlayerPopover from './player-popover';
import Button from '../../../components/button';
import Slider from '../../../components/slider';
import type { SliderRef } from '../../../components/slider';
import { usePlayerStore } from '../../../stores/player-store';

const formatOffset = (ms: number) =>
  `${ms > 0 ? '+' : ms < 0 ? '−' : ''}${Math.abs(ms)} ms`;

export default function SyncPopover() {
  const offsetMs = usePlayerStore((s) => s.offsetMs);
  const { setOffset, nudgeOffset } = usePlayerStore.getState();
  const sliderRef = useRef<SliderRef>(null);

  useEffect(() => {
    sliderRef.current?.setValue(offsetMs);
  }, [offsetMs]);

  const hint =
    offsetMs === 0
      ? 'Lights match the video'
      : `Lights ${Math.abs(offsetMs)} ms ${offsetMs > 0 ? 'later' : 'earlier'}`;

  return (
    <PlayerPopover
      id="player-sync"
      label="Sync offset"
      heading="Sync"
      lit={offsetMs !== 0}
      trigger={
        <>
          <Timer aria-hidden="true" />
          {offsetMs === 0 ? 'Sync' : formatOffset(offsetMs)}
        </>
      }
    >
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Sync</h2>
          <Button intent="ghost" size="sm" onClick={() => setOffset(0)}>
            Reset
          </Button>
        </div>
        <div className="flex items-baseline gap-2.5">
          <output
            aria-live="polite"
            className="text-[28px] leading-none font-semibold tracking-tight tabular-nums"
          >
            {formatOffset(offsetMs)}
          </output>
          <span className="text-xs text-on-surface-variant">{hint}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="relative flex h-3.5 items-center">
            <span
              aria-hidden="true"
              className="absolute left-1/2 h-2.5 w-px bg-outline"
            />
            <Slider
              ref={sliderRef}
              min={-1000}
              max={1000}
              step={10}
              defaultValue={offsetMs}
              aria-label="Sync offset"
              className="relative min-w-0 flex-1 bg-none!"
              onChange={setOffset}
            />
          </div>
          <div className="flex justify-between text-[11px] text-outline">
            <span>Earlier</span>
            <span>Later</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            aria-label="Lights 10 ms earlier"
            className="tabular-nums"
            onClick={() => nudgeOffset(-10)}
          >
            −10 ms
          </Button>
          <Button
            aria-label="Lights 10 ms later"
            className="tabular-nums"
            onClick={() => nudgeOffset(10)}
          >
            +10 ms
          </Button>
        </div>
        <p className="text-[11px] leading-normal text-outline">
          Press , and . to nudge (⇧ for 50 ms)
        </p>
      </div>
    </PlayerPopover>
  );
}
