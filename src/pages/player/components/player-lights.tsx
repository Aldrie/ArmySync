import { Pause, Play } from 'lucide-react';
import { useEffect } from 'react';

import PlayerProgress from './player-progress';
import SkipIcon from './skip-icon';
import { STICKS_POPOVER_ID } from './sticks-popover';
import IconButton from '../../../components/icon-button';
import { LightstickPreview } from '../../../domains/lightstick';
import { useBleStore } from '../../../stores/ble-store';
import { usePlayerStore } from '../../../stores/player-store';

const openSticksPopover = () => {
  const popover = document.getElementById(STICKS_POPOVER_ID);
  popover?.showPopover();
  popover?.querySelector<HTMLElement>('button, input')?.focus();
};

export default function PlayerLights() {
  const title = usePlayerStore((s) => s.project?.name);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { togglePlay, seekDelta, tickLights } = usePlayerStore.getState();
  const stickNames = useBleStore((s) =>
    s.connectedDevices.map((d) => d.name).join(' · '),
  );

  useEffect(() => {
    if (!isPlaying) return;
    let frame = requestAnimationFrame(function tick() {
      tickLights();
      if (usePlayerStore.getState().isPlaying)
        frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, tickLights]);

  const skipClass = 'size-11 rounded-full [&_svg]:size-6.5';

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center gap-6.5 overflow-y-auto px-6 pb-6">
      {stickNames && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_34%_44%_at_50%_34%,color-mix(in_srgb,var(--ls-c)_20%,transparent),transparent_72%)]"
        />
      )}
      <LightstickPreview
        height={360}
        emptyOff
        onConnect={openSticksPopover}
        className="relative mt-auto"
      />
      <div className="relative flex max-w-160 flex-col items-center gap-1.5 text-center">
        <h2 className="font-display text-[26px] font-bold tracking-tight text-balance text-on-surface">
          {title}
        </h2>
        {stickNames && (
          <span className="text-[13px] text-outline">{stickNames}</span>
        )}
      </div>
      <div className="relative mb-auto flex w-140 max-w-full flex-col items-center gap-3.5">
        <PlayerProgress size="lg" />
        <div className="flex items-center gap-8">
          <IconButton
            label="Back 10 seconds"
            title="Back 10 s (←)"
            className={skipClass}
            onClick={() => seekDelta(-10)}
          >
            <SkipIcon />
          </IconButton>
          <IconButton
            label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="size-16 rounded-full bg-on-surface text-surface shadow-[0_2px_8px_rgba(0,0,0,0.5)] hover:bg-white hover:text-surface [&_svg]:size-6.5"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause fill="currentColor" />
            ) : (
              <Play fill="currentColor" className="translate-x-0.5" />
            )}
          </IconButton>
          <IconButton
            label="Forward 10 seconds"
            title="Forward 10 s (→)"
            className={skipClass}
            onClick={() => seekDelta(10)}
          >
            <SkipIcon forward />
          </IconButton>
        </div>
      </div>
    </main>
  );
}
