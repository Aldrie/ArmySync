import {
  Maximize,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeOff,
} from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import FullscreenControls from './fullscreen-controls';
import PlayerProgress from './player-progress';
import SkipIcon from './skip-icon';
import IconButton from '../../../components/icon-button';
import Slider from '../../../components/slider';
import type { SliderRef } from '../../../components/slider';
import {
  JELLYFIN_SESSION_ERRORS,
  JELLYFIN_VERSION_GONE,
} from '../../../domains/jellyfin';
import { LightstickPreview } from '../../../domains/lightstick';
import { getSongMedia, isJellyfinMedia } from '../../../domains/project';
import { cn } from '../../../lib/cn';
import { useKeybind } from '../../../lib/use-keybind';
import { useBleStore } from '../../../stores/ble-store';
import { playerRefs, usePlayerStore } from '../../../stores/player-store';

const SERVER_REFUSALS = [...JELLYFIN_SESSION_ERRORS, JELLYFIN_VERSION_GONE];

const setVideoRef = (el: HTMLVideoElement | null) => {
  playerRefs.video = el;
};

const onFullscreenChange = (cb: () => void) => {
  document.addEventListener('fullscreenchange', cb);
  return () => document.removeEventListener('fullscreenchange', cb);
};

export default function PlayerVideo() {
  const stageRef = useRef<HTMLElement>(null);
  const fullscreen = useSyncExternalStore(
    onFullscreenChange,
    () => !!document.fullscreenElement,
  );
  const toggleFullscreen = () => {
    const change = document.fullscreenElement
      ? document.exitFullscreen()
      : stageRef.current?.requestFullscreen();
    change?.catch((e: unknown) => console.error('Full screen refused:', e));
  };
  useKeybind(
    {
      KeyF: (e) => {
        if (!e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey)
          toggleFullscreen();
      },
    },
    { allowRange: true },
  );

  const videoSrc = usePlayerStore((s) => s.videoSrc);
  const mediaError = usePlayerStore((s) => s.mediaError);
  const media = usePlayerStore(
    (s) => (s.project && getSongMedia(s.project)?.media) ?? null,
  );
  const audioOnly = media?.type === 'audio';
  const {
    onVideoTime,
    onVideoLoaded,
    onVideoEnded,
    onVideoError,
    onVideoStalled,
    onVideoResumed,
  } = usePlayerStore.getState();

  const errorTitle = (error: string) => {
    if (SERVER_REFUSALS.some((m) => error.startsWith(m)))
      return "Can't play from Jellyfin";
    if (media && isJellyfinMedia(media)) return 'Jellyfin server unreachable';
    return "Can't play this video";
  };

  return (
    <>
      <main
        ref={stageRef}
        className={cn(
          'relative flex min-h-0 flex-1 items-center justify-center',
          fullscreen ? 'bg-black' : 'px-6 pt-1',
        )}
      >
        {mediaError ? (
          <div
            role="alert"
            className="flex max-w-md flex-col items-center gap-2 text-center"
          >
            <p className="text-sm font-medium text-on-surface">
              {errorTitle(mediaError)}
            </p>
            <p className="max-w-full text-xs text-on-surface-variant">
              {mediaError}
            </p>
            <p className="text-xs text-outline">
              Switch to Lights only and back, or reopen the project to try
              again.
            </p>
          </div>
        ) : (
          audioOnly && <LightstickPreview height={300} />
        )}
        {videoSrc && !mediaError && (
          <video
            ref={setVideoRef}
            src={videoSrc}
            className={
              audioOnly
                ? 'hidden'
                : fullscreen
                  ? 'size-full object-contain'
                  : 'h-full max-w-full rounded-lg bg-black ring-1 ring-border'
            }
            onTimeUpdate={(e) => onVideoTime(e.currentTarget.currentTime)}
            onLoadedMetadata={onVideoLoaded}
            onEnded={onVideoEnded}
            onError={onVideoError}
            onWaiting={onVideoStalled}
            onPlaying={onVideoResumed}
          />
        )}
        {fullscreen && <FullscreenControls onExit={toggleFullscreen} />}
      </main>
      <NowPlayingBar onFullscreen={toggleFullscreen} />
    </>
  );
}

function NowPlayingBar({ onFullscreen }: { onFullscreen: () => void }) {
  const title = usePlayerStore((s) => s.project?.name);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const blocked = usePlayerStore((s) => !!s.mediaError);
  const stickNames = useBleStore((s) =>
    s.connectedDevices.map((d) => d.name).join(' · '),
  );
  const { setMode, togglePlay, seekDelta, setVolume, toggleMute } =
    usePlayerStore.getState();
  const volumeRef = useRef<SliderRef>(null);

  useEffect(() => {
    volumeRef.current?.setValue(muted ? 0 : volume * 100);
  }, [volume, muted]);

  const audible = muted ? 0 : volume;
  const VolumeIcon =
    audible === 0 ? VolumeOff : audible < 0.5 ? Volume1 : Volume2;
  const skipClass = 'size-9 rounded-full [&_svg]:size-[22px]';

  return (
    <footer className="grid h-33 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-7 pb-1.5">
      <div className="flex min-w-0 items-center gap-3.5">
        <button
          type="button"
          aria-label="Show lights only"
          title="Lights only"
          onClick={() => void setMode('lights')}
          className="flex h-29 shrink-0 cursor-pointer items-end rounded-lg px-1"
        >
          <LightstickPreview height={108} />
        </button>
        <div className="flex min-w-0 flex-col gap-0.75">
          <span className="truncate text-sm font-semibold text-on-surface">
            {title}
          </span>
          {stickNames && (
            <span className="truncate text-xs text-outline">{stickNames}</span>
          )}
        </div>
      </div>

      <div className="flex w-130 flex-col items-center gap-2.5">
        <div className="flex items-center gap-5">
          <IconButton
            label="Back 10 seconds"
            title="Back 10 s (←)"
            className={skipClass}
            disabled={blocked}
            onClick={() => seekDelta(-10)}
          >
            <SkipIcon />
          </IconButton>
          <IconButton
            label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="size-12 rounded-full bg-on-surface text-surface shadow-[0_1px_2px_rgba(0,0,0,0.5)] hover:bg-white hover:text-surface [&_svg]:size-5"
            disabled={blocked}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause fill="currentColor" />
            ) : (
              <Play fill="currentColor" className="translate-x-px" />
            )}
          </IconButton>
          <IconButton
            label="Forward 10 seconds"
            title="Forward 10 s (→)"
            className={skipClass}
            disabled={blocked}
            onClick={() => seekDelta(10)}
          >
            <SkipIcon forward />
          </IconButton>
        </div>
        <PlayerProgress size="sm" />
      </div>

      <div className="flex items-center justify-end gap-2">
        <IconButton
          size="md"
          label={muted ? 'Unmute' : 'Mute'}
          className="[&_svg]:size-4.5"
          onClick={toggleMute}
        >
          <VolumeIcon />
        </IconButton>
        <div
          className="flex"
          onKeyDown={(e) => {
            if (e.code.startsWith('Arrow')) e.stopPropagation();
          }}
        >
          <Slider
            ref={volumeRef}
            min={0}
            max={100}
            defaultValue={(muted ? 0 : volume) * 100}
            aria-label="Volume"
            className="w-22"
            onChange={(value) => setVolume(value / 100)}
          />
        </div>
        <IconButton
          size="md"
          label="Full screen"
          title="Full screen (F)"
          className="ml-1 [&_svg]:size-4.5"
          onClick={onFullscreen}
        >
          <Maximize />
        </IconButton>
      </div>
    </footer>
  );
}
