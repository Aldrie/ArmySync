import { Cast, ChevronRight, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';

import PlayerPopover from './player-popover';
import Button from '../../../components/button';
import { castDevices, jellyfinStatus } from '../../../domains/jellyfin/api';
import type { CastDevice } from '../../../domains/jellyfin/api';
import { cn } from '../../../lib/cn';
import { errorMessage, formatTimeAgo } from '../../../lib/format';
import { useAppStore } from '../../../stores/app-store';
import { jellyfinSourceOf, usePlayerStore } from '../../../stores/player-store';
import type { FollowState } from '../../../stores/player-store';
import { followPill } from '../follow-pill';
import type { FollowPill } from '../follow-pill';

const PILL_TONE: Record<FollowPill, string> = {
  Following: 'bg-primary/12 text-primary',
  'Pick a show': 'bg-primary/12 text-primary',
  'Paused on TV': 'bg-surface-high text-on-surface-variant',
  'Starting on TV': 'bg-surface-high text-on-surface-variant',
  'Nothing playing': 'bg-surface-high text-on-surface-variant',
  'No light show': 'bg-surface-high text-on-surface-variant',
  Reconnecting: 'bg-[#ffc46e]/12 text-[#ffcf8a]',
};

export default function CastPopover() {
  const follow = usePlayerStore((s) => s.follow);
  const canPlay = usePlayerStore((s) => !!jellyfinSourceOf(s.project));
  const [signedIn, setSignedIn] = useState(false);
  const [devices, setDevices] = useState<CastDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    jellyfinStatus()
      .then((status) => {
        if (live) setSignedIn(status !== null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!signedIn && !follow) return null;

  const loadSessions = () => {
    setDevices(null);
    setError(null);
    castDevices()
      .then(setDevices)
      .catch((e: unknown) => setError(errorMessage(e)));
  };

  const handleOpenChange = (open: boolean) => {
    if (open && !usePlayerStore.getState().follow) loadSessions();
  };

  const handleStop = () => {
    usePlayerStore.getState().stopFollow();
    loadSessions();
  };

  const handlePick = (device: CastDevice) => {
    setError(null);
    usePlayerStore
      .getState()
      .startFollow(device)
      .catch((e: unknown) => setError(errorMessage(e)));
  };

  return (
    <PlayerPopover
      id="player-cast"
      label={
        follow ? `Following ${follow.deviceName}` : 'Follow a Jellyfin device'
      }
      heading="Follow a Jellyfin device"
      lit={!!follow}
      trigger={<Cast aria-hidden="true" />}
      onOpenChange={handleOpenChange}
      className="w-80"
    >
      {follow ? (
        <Following follow={follow} onStop={handleStop} />
      ) : (
        <div className="flex flex-col gap-1 p-2">
          <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1.5">
            <h2 className="text-[13px] font-semibold">Follow a device</h2>
            <p className="text-xs leading-snug text-outline">
              Lights follow what a Jellyfin device is playing.
            </p>
          </div>
          {error ? (
            <p role="alert" className="px-2 py-1.5 text-xs text-error">
              {error}
            </p>
          ) : devices?.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-on-surface-variant">
              No Jellyfin devices are online.
            </p>
          ) : (
            devices && (
              <>
                <DeviceSection
                  title="Playing now"
                  devices={devices.filter((d) => d.nowPlaying)}
                  onPick={handlePick}
                />
                <DeviceSection
                  title="Available"
                  devices={devices.filter((d) => !d.nowPlaying)}
                  disabled={!canPlay}
                  onPick={handlePick}
                />
              </>
            )
          )}
          <p className="px-2 pt-1.5 pb-1 text-[11px] text-outline">
            Devices show up while the Jellyfin app is open.
          </p>
        </div>
      )}
    </PlayerPopover>
  );
}

function DeviceSection({
  title,
  devices,
  disabled = false,
  onPick,
}: {
  title: string;
  devices: CastDevice[];
  disabled?: boolean;
  onPick: (device: CastDevice) => void;
}) {
  if (devices.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-2 pt-1.5 text-[11px] font-semibold text-outline">
        {title}
      </h3>
      {devices.map((d) => (
        <button
          key={d.sessionId}
          type="button"
          disabled={disabled}
          onClick={() => onPick(d)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-high text-on-surface-variant">
            <Tv aria-hidden="true" className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[13px] font-medium">
              {d.deviceName}
            </span>
            <span className="truncate text-[11px] text-outline">
              {d.nowPlaying
                ? `Playing · ${d.nowPlaying.title}`
                : disabled
                  ? 'Open a project with a Jellyfin video to play it on a device'
                  : 'Play this show here'}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-outline"
          />
        </button>
      ))}
    </div>
  );
}

function Following({
  follow,
  onStop,
}: {
  follow: FollowState;
  onStop: () => void;
}) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const project = usePlayerStore((s) => s.project);
  const { chooseFollowProject } = usePlayerStore.getState();
  const closePlayer = useAppStore((s) => s.closePlayer);
  const pill = followPill(follow, isPlaying);

  const message: Record<FollowPill, string> = {
    Following: `Light show: ${project?.name ?? follow.title}`,
    'Paused on TV': 'The lights wait and pick up when the TV plays again.',
    'Starting on TV':
      'Asked the TV to play this show. The lights start with it.',
    Reconnecting:
      'Lost contact with the TV. The lights are paused until it is back.',
    'Nothing playing': 'Nothing is playing on the TV right now.',
    'No light show':
      'None of your projects match this video, so the lights stay off.',
    'Pick a show': `${follow.candidates.length} projects match this video. Pick the one to play.`,
  };

  return (
    <div className="flex flex-col gap-2.5 p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            pill === 'Following'
              ? 'bg-primary/12 text-primary'
              : 'bg-surface-high text-on-surface-variant',
          )}
        >
          <Tv aria-hidden="true" className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[13px] font-semibold">
            {follow.deviceName}
          </span>
          <span className="text-[11px] text-outline">Jellyfin</span>
        </span>
        <span
          className={cn(
            'flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.25 text-[11px] font-semibold',
            PILL_TONE[pill],
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 rounded-full bg-current',
              pill === 'Following' && 'shadow-[0_0_6px_currentColor]',
            )}
          />
          {pill}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface-low px-3 py-2.5">
        <span className="text-[11px] text-outline">On TV</span>
        <span className="text-[13px] font-medium">{follow.title}</span>
      </div>
      <p
        aria-live="polite"
        className="px-0.5 text-xs leading-normal text-on-surface-variant"
      >
        {message[pill]}
      </p>
      {follow.candidates.length > 1 && (
        <div
          role="radiogroup"
          aria-label="Light show"
          className="flex flex-col gap-1"
        >
          {follow.candidates.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border-strong bg-surface-high px-2.5 py-2.25 transition-colors hover:bg-surface-highest has-checked:border-primary/60"
            >
              <input
                type="radio"
                name="follow-show"
                checked={project?.id === c.id}
                onChange={() =>
                  void chooseFollowProject(c.id).catch((e: unknown) =>
                    console.error('Failed to load the light show:', e),
                  )
                }
                className="size-3.5 shrink-0 accent-primary"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-[13px] font-medium">
                  {c.name}
                </span>
                <span className="text-[11px] text-outline">
                  Edited {formatTimeAgo(new Date(c.updatedAt))}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      {pill === 'No light show' && (
        <Button onClick={closePlayer}>Choose a project</Button>
      )}
      <Button intent="ghost" onClick={onStop}>
        Stop following
      </Button>
    </div>
  );
}
