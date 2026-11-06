import {
  Minimize,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import PlayerProgress from './player-progress';
import SkipIcon from './skip-icon';
import IconButton from '../../../components/icon-button';
import { previewModels } from '../../../domains/lightstick';
import { cn } from '../../../lib/cn';
import { videoTime } from '../../../lib/format';
import { useBleStore } from '../../../stores/ble-store';
import { usePlayerStore } from '../../../stores/player-store';

const HIDE_AFTER_MS = 2000;

export default function FullscreenControls({ onExit }: { onExit: () => void }) {
  const title = usePlayerStore((s) => s.project?.name);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const blocked = usePlayerStore((s) => !!s.mediaError);
  const { togglePlay, seekDelta, toggleMute } = usePlayerStore.getState();
  const devices = useBleStore((s) => s.connectedDevices);
  const models = previewModels(devices);
  const sticks = devices.map((d) => d.name).join(' · ');

  const [idle, setIdle] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wake = () => {
    setIdle(false);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIdle(true), HIDE_AFTER_MS);
  };

  useEffect(() => {
    hideTimer.current = setTimeout(() => setIdle(true), HIDE_AFTER_MS);
    return () => clearTimeout(hideTimer.current);
  }, []);

  const audible = muted ? 0 : volume;
  const VolumeIcon =
    audible === 0 ? VolumeOff : audible < 0.5 ? Volume1 : Volume2;
  const fade = cn(
    'absolute inset-x-0 px-8 transition-opacity duration-300',
    idle && 'pointer-events-none opacity-0',
  );
  const button =
    'size-10 rounded-lg text-white hover:bg-white/10 hover:text-white [&_svg]:size-5';

  return (
    <div
      onMouseMove={wake}
      className={cn('absolute inset-0', idle && 'cursor-none')}
    >
      <div
        className={cn(
          fade,
          'top-0 h-27.5 bg-linear-to-b from-black/65 to-transparent pt-5.5',
        )}
      >
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>

      <div
        className={cn(
          fade,
          'bottom-0 flex h-42.5 flex-col justify-end gap-2.5 bg-linear-to-t from-black/80 to-transparent pb-5',
        )}
      >
        <PlayerProgress size="bar" />
        <div className="flex items-center gap-1.5">
          <IconButton
            label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className={button}
            disabled={blocked}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause fill="currentColor" />
            ) : (
              <Play fill="currentColor" />
            )}
          </IconButton>
          <IconButton
            label="Back 10 seconds"
            title="Back 10 s (←)"
            className={button}
            disabled={blocked}
            onClick={() => seekDelta(-10)}
          >
            <SkipIcon />
          </IconButton>
          <IconButton
            label="Forward 10 seconds"
            title="Forward 10 s (→)"
            className={button}
            disabled={blocked}
            onClick={() => seekDelta(10)}
          >
            <SkipIcon forward />
          </IconButton>
          <span className="ml-2 text-[13px] text-white/85 tabular-nums">
            {videoTime(currentTime)} / {videoTime(duration)}
          </span>

          <span className="flex-1" />

          {models.length > 0 && (
            <span
              role="img"
              aria-label={sticks}
              title={sticks}
              className="mr-1.5 flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-2.5"
            >
              {models.map((model) => (
                <span
                  key={model}
                  className="size-2.5 shrink-0 rounded-full bg-(--ls-c) shadow-[0_0_8px_var(--ls-c)]"
                />
              ))}
            </span>
          )}
          <IconButton
            label={muted ? 'Unmute' : 'Mute'}
            className={button}
            onClick={toggleMute}
          >
            <VolumeIcon />
          </IconButton>
          <IconButton
            label="Exit full screen"
            title="Exit full screen (Esc)"
            className={button}
            onClick={onExit}
          >
            <Minimize />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
