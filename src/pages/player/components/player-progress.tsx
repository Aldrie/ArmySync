import { useEffect, useRef } from 'react';

import Slider from '../../../components/slider';
import type { SliderRef } from '../../../components/slider';
import { cn } from '../../../lib/cn';
import { videoTime } from '../../../lib/format';
import { usePlayerStore } from '../../../stores/player-store';

export default function PlayerProgress({
  size,
}: {
  size: 'sm' | 'lg' | 'bar';
}) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const blocked = usePlayerStore((s) => !!s.mediaError);
  const sliderRef = useRef<SliderRef>(null);

  useEffect(() => {
    sliderRef.current?.setValue(currentTime);
  }, [currentTime, duration]);

  const slider = (
    <Slider
      ref={sliderRef}
      min={0}
      max={duration || 1}
      step={0.1}
      defaultValue={currentTime}
      aria-label="Seek"
      disabled={blocked}
      className="min-w-0 flex-1"
      onChange={seek}
    />
  );
  const timeClass = 'text-xs tabular-nums';

  if (size === 'bar') return <div className="flex">{slider}</div>;

  if (size === 'lg') {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex">{slider}</div>
        <div className={cn('flex justify-between text-outline', timeClass)}>
          <span>{videoTime(currentTime)}</span>
          <span>{videoTime(duration)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-3">
      <span
        className={cn('w-13 text-right text-on-surface-variant', timeClass)}
      >
        {videoTime(currentTime)}
      </span>
      {slider}
      <span className={cn('w-13 text-outline', timeClass)}>
        {videoTime(duration)}
      </span>
    </div>
  );
}
