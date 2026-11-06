import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { syncEffectsToRust } from './editor-store';
import {
  followStart,
  followStop,
  sessionCommand,
} from '../domains/jellyfin/api';
import type { FollowEvent, PlayingSession } from '../domains/jellyfin/api';
import {
  getSongEffects,
  getSongMedia,
  isJellyfinMedia,
  listProjects,
  loadProject,
} from '../domains/project';
import type { Project } from '../domains/project';
import {
  openSongSource,
  releaseSongSource,
} from '../domains/project/song-source';
import { clampOffset, loadSettings, updateSettings } from '../lib/settings';
import type { PlayerMode } from '../lib/settings';

const DEFAULT_VOLUME = 0.25;
const RESYNC_THRESHOLD = 0.04;
const REALIGN_THRESHOLD = 0.1;
const COMMAND_WINDOW = 1;
const SEEK_WINDOW = 3.5;

export const playerRefs: { video: HTMLVideoElement | null } = { video: null };

let anchorTime = 0;
let anchorAt = 0;
let running = false;

const now = () => performance.now() / 1000;
const clockTime = () => (running ? anchorTime + now() - anchorAt : anchorTime);
const clockSeek = (time: number) => {
  anchorTime = time;
  anchorAt = now();
};
const clockPlay = (time: number) => {
  clockSeek(time);
  running = true;
};
const clockPause = () => {
  anchorTime = clockTime();
  running = false;
};

export interface FollowState {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  status: 'live' | 'idle' | 'lost';
  title: string;
  itemId: string | null;
  versionMismatch: boolean;
  candidates: { id: string; name: string; updatedAt: number }[];
  chosen: boolean;
}

type FollowReport = Extract<FollowEvent, { kind: 'report' }>;

let pending:
  | { kind: 'pause' | 'play'; until: number }
  | { kind: 'seek'; positionS: number; until: number }
  | null = null;
let followRun = 0;
let followLoad = 0;
let followQueue: Promise<void> = Promise.resolve();
let followCommands: Promise<unknown> = Promise.resolve();
let unlistenFollow: UnlistenFn | null = null;
let reportedSourceId: string | null = null;
let beforeFollow: { mode: PlayerMode; offsetMs: number } = {
  mode: 'video',
  offsetMs: 0,
};

const logFollowError = (e: unknown) =>
  console.error('Failed to follow the TV:', e);

// Start and stop share a session id in Rust, so a stop must not overtake an earlier start.
const queueFollowCommand = (task: () => Promise<void>) => {
  const run = followCommands.then(task);
  followCommands = run.catch(() => undefined);
  return run;
};

const settles = (report: FollowReport) =>
  !pending ||
  now() > pending.until ||
  (pending.kind === 'seek'
    ? Math.abs(report.positionS - pending.positionS) < 1
    : report.paused === (pending.kind === 'pause'));

interface PlayerState {
  project: Project | null;
  mode: PlayerMode;
  ready: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  offsetMs: number;
  videoSrc: string;
  mediaError: string | null;
  volume: number;
  muted: boolean;
  follow: FollowState | null;

  open: (project: Project) => Promise<void>;
  leave: () => void;
  setMode: (mode: PlayerMode) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekDelta: (delta: number) => void;
  setOffset: (ms: number) => void;
  nudgeOffset: (deltaMs: number) => void;
  tickLights: () => void;
  onVideoTime: (time: number) => void;
  onVideoLoaded: () => void;
  onVideoEnded: () => void;
  onVideoError: () => void;
  onVideoStalled: () => void;
  onVideoResumed: () => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  startFollow: (session: PlayingSession) => Promise<void>;
  stopFollow: () => void;
  chooseFollowProject: (projectId: string) => Promise<void>;
}

const session = {
  project: null,
  ready: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  offsetMs: 0,
  videoSrc: '',
  mediaError: null,
  follow: null,
};

export const usePlayerStore = create<PlayerState>((set, get) => {
  const engineTime = (time: number) => time - get().offsetMs / 1000;

  const startClock = (time: number) => {
    clockPlay(time);
    void invoke('sync_play', { time: engineTime(time) });
  };

  const stopAtEnd = () => {
    const end =
      get().duration || (playerRefs.video?.currentTime ?? clockTime());
    get().pause();
    clockSeek(end);
    set({ currentTime: end });
  };

  const applyMode = async (mode: PlayerMode) => {
    if (mode === get().mode) return;
    if (mode === 'lights') {
      playerRefs.video?.pause();
      releaseSongSource();
      if (get().isPlaying) {
        const time = playerRefs.video?.currentTime ?? clockTime();
        if (running) clockSeek(time);
        else startClock(time);
      }
      set({ mode, videoSrc: '', mediaError: null });
      return;
    }
    if (get().isPlaying) {
      clockPause();
      void invoke('sync_pause');
    }
    set({ mode, currentTime: clockTime() });
    const { project } = get();
    if (!project) return;
    const source = await openSongSource(project);
    if (source && get().project === project)
      set(source.mediaError ? { ...source, isPlaying: false } : source);
  };

  const patchFollow = (patch: Partial<FollowState>) => {
    const { follow } = get();
    if (follow) set({ follow: { ...follow, ...patch } });
  };

  const isCurrent = (run: number, itemId: string) =>
    run === followRun && get().follow?.itemId === itemId;

  const versionMismatch = (project: Project | null) => {
    const media = project && getSongMedia(project)?.media;
    return (
      !!media &&
      isJellyfinMedia(media) &&
      reportedSourceId !== null &&
      media.source.mediaSourceId !== reportedSourceId
    );
  };

  const loadFollowProject = async (id: string, current: () => boolean) => {
    const load = ++followLoad;
    const project = await loadProject(id);
    if (load !== followLoad || !current()) return;
    set({ project, duration: getSongMedia(project)?.media.duration ?? 0 });
    syncEffectsToRust(getSongEffects(project));
    patchFollow({ versionMismatch: versionMismatch(project) });
  };

  const switchItem = async (report: FollowReport, run: number) => {
    pending = null;
    get().pause();
    syncEffectsToRust([]);
    const [summaries, { followChoices }] = await Promise.all([
      listProjects(),
      loadSettings(),
    ]);
    if (run !== followRun) return false;
    const candidates = summaries
      .filter((p) => p.jellyfinItemId === report.itemId)
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }));
    const remembered = candidates.find(
      (c) => c.id === followChoices[report.itemId],
    );
    patchFollow({
      itemId: report.itemId,
      title: report.title,
      candidates,
      chosen: !!remembered,
      versionMismatch: false,
    });
    const chosen = remembered ?? candidates[0];
    const current = () => isCurrent(run, report.itemId);
    if (chosen) await loadFollowProject(chosen.id, current);
    else set({ project: null, duration: 0 });
    return current();
  };

  const applyReport = (report: FollowReport) => {
    if (!settles(report)) return;
    pending = null;
    const { positionS } = report;
    if (report.paused) {
      running = false;
      clockSeek(positionS);
      void invoke('sync_pause');
      void invoke('sync_seek', { time: engineTime(positionS) });
    } else if (!running) {
      startClock(positionS);
    } else if (Math.abs(clockTime() - positionS) > REALIGN_THRESHOLD) {
      clockSeek(positionS);
      void invoke('sync_seek', { time: engineTime(positionS) });
    }
    set({ isPlaying: !report.paused, currentTime: clockTime() });
    patchFollow({
      status: 'live',
      title: report.title,
      versionMismatch: versionMismatch(get().project),
    });
  };

  const handleFollowEvent = async (event: FollowEvent, receivedAt: number) => {
    const { follow } = get();
    if (!follow || event.sessionId !== follow.sessionId) return;
    if (event.kind !== 'report') {
      pending = null;
      get().pause();
      patchFollow({ status: event.kind });
      return;
    }
    reportedSourceId = event.mediaSourceId;
    if (event.itemId !== follow.itemId && !(await switchItem(event, followRun)))
      return;
    applyReport(
      event.paused
        ? event
        : { ...event, positionS: event.positionS + now() - receivedAt },
    );
  };

  const enqueueFollow = (event: FollowEvent) => {
    const receivedAt = now();
    followQueue = followQueue
      .then(() => handleFollowEvent(event, receivedAt))
      .catch(logFollowError);
  };

  const endFollow = () => {
    const { follow } = get();
    if (!follow) return;
    followRun++;
    void queueFollowCommand(() => followStop(follow.sessionId)).catch(
      logFollowError,
    );
    unlistenFollow?.();
    unlistenFollow = null;
    pending = null;
    get().pause();
    const { project } = get();
    syncEffectsToRust(project ? getSongEffects(project) : []);
    set({ follow: null, offsetMs: beforeFollow.offsetMs });
  };

  return {
    ...session,
    mode: 'video',
    volume: DEFAULT_VOLUME,
    muted: false,

    open: async (project) => {
      endFollow();
      void invoke('sync_pause');
      running = false;
      clockSeek(0);
      set({ ...session, project });
      const { playerMode } = await loadSettings();
      if (get().project !== project) return;
      set({
        mode: playerMode,
        duration: getSongMedia(project)?.media.duration ?? 0,
      });
      syncEffectsToRust(getSongEffects(project));
      void invoke('sync_seek', { time: 0 });
      if (playerMode === 'video') {
        const source = await openSongSource(project);
        if (get().project !== project) return;
        if (source) set(source);
      }
      set({ ready: true });
    },

    leave: () => {
      if (get().follow) {
        endFollow();
        set({ mode: beforeFollow.mode });
      }
      void invoke('sync_pause');
      syncEffectsToRust([]);
      releaseSongSource();
      running = false;
      clockSeek(0);
      set(session);
    },

    setMode: async (mode) => {
      if (mode === get().mode || get().follow) return;
      void updateSettings({ playerMode: mode });
      await applyMode(mode);
    },

    play: () => {
      const { duration, currentTime, mode } = get();
      if (duration > 0 && currentTime >= duration) get().seek(0);
      set({ isPlaying: true });
      if (mode === 'lights') {
        startClock(clockTime());
        return;
      }
      const el = playerRefs.video;
      // A play cut short by pause or a source swap is retried by onVideoLoaded or dropped.
      void el?.play().then(
        () => {
          if (get().isPlaying) startClock(el.currentTime);
        },
        () => undefined,
      );
    },

    pause: () => {
      if (get().mode === 'video') playerRefs.video?.pause();
      clockPause();
      set({ isPlaying: false, currentTime: clockTime() });
      void invoke('sync_pause');
    },

    togglePlay: () => {
      const { follow, isPlaying } = get();
      if (follow) {
        void sessionCommand(
          follow.sessionId,
          isPlaying ? 'Pause' : 'Unpause',
        ).catch(logFollowError);
        pending = {
          kind: isPlaying ? 'pause' : 'play',
          until: now() + COMMAND_WINDOW,
        };
      }
      if (isPlaying) get().pause();
      else if (follow) {
        startClock(clockTime());
        set({ isPlaying: true });
      } else get().play();
    },

    seek: (time) => {
      const { duration, mode } = get();
      const clamped = Math.max(
        0,
        duration > 0 ? Math.min(duration, time) : time,
      );
      clockSeek(clamped);
      if (mode === 'video' && playerRefs.video)
        playerRefs.video.currentTime = clamped;
      set({ currentTime: clamped });
      void invoke('sync_seek', { time: engineTime(clamped) });
      const { follow } = get();
      if (!follow) return;
      pending = {
        kind: 'seek',
        positionS: clamped,
        until: now() + SEEK_WINDOW,
      };
      void sessionCommand(follow.sessionId, 'Seek', clamped).catch(
        logFollowError,
      );
    },

    seekDelta: (delta) => {
      get().seek(clockTime() + delta);
    },

    setOffset: (ms) => {
      const offsetMs = clampOffset(ms);
      set({ offsetMs });
      if (get().isPlaying)
        void invoke('sync_seek', { time: engineTime(clockTime()) });
      const { follow } = get();
      if (follow)
        void loadSettings().then(({ followOffsets }) =>
          updateSettings({
            followOffsets: { ...followOffsets, [follow.deviceId]: offsetMs },
          }),
        );
    },

    nudgeOffset: (deltaMs) => {
      get().setOffset(get().offsetMs + deltaMs);
    },

    tickLights: () => {
      const { duration, currentTime } = get();
      const time = clockTime();
      if (duration > 0 && time >= duration && !get().follow) {
        stopAtEnd();
        return;
      }
      if (Math.floor(time * 10) !== Math.floor(currentTime * 10))
        set({ currentTime: time });
    },

    onVideoTime: (time) => {
      set({ currentTime: time });
      if (get().isPlaying && Math.abs(clockTime() - time) > RESYNC_THRESHOLD) {
        clockSeek(time);
        void invoke('sync_seek', { time: engineTime(time) });
      }
    },

    onVideoLoaded: () => {
      const el = playerRefs.video;
      if (!el) return;
      el.volume = get().volume;
      el.muted = get().muted;
      if (get().duration === 0 && Number.isFinite(el.duration))
        set({ duration: el.duration });
      el.currentTime = get().currentTime;
      if (get().isPlaying) get().play();
    },

    onVideoEnded: stopAtEnd,

    onVideoError: () => {
      // A released source can still report its error after the switch or leave.
      if (!get().videoSrc) return;
      get().pause();
      set({ mediaError: 'The video stream stopped.' });
    },

    onVideoStalled: () => {
      if (!get().isPlaying) return;
      clockPause();
      void invoke('sync_pause');
    },

    onVideoResumed: () => {
      const el = playerRefs.video;
      if (!get().isPlaying || !el) return;
      startClock(el.currentTime);
    },

    setVolume: (value) => {
      const volume = Math.max(0, Math.min(1, value));
      set({ volume, muted: volume === 0 });
      const el = playerRefs.video;
      if (el) {
        el.volume = volume;
        el.muted = volume === 0;
      }
    },

    toggleMute: () => {
      const muted = !get().muted;
      set({ muted });
      if (playerRefs.video) playerRefs.video.muted = muted;
    },

    startFollow: async (playing) => {
      if (get().follow) endFollow();
      else beforeFollow = { mode: get().mode, offsetMs: get().offsetMs };
      const run = ++followRun;
      const { sessionId, deviceId, deviceName, title } = playing;
      set({
        follow: {
          sessionId,
          deviceId,
          deviceName,
          status: 'live',
          title,
          itemId: null,
          versionMismatch: false,
          candidates: [],
          chosen: false,
        },
      });
      void applyMode('lights');
      try {
        const [unlisten, { followOffsets }] = await Promise.all([
          listen<FollowEvent>('jellyfin-follow', (e) => {
            enqueueFollow(e.payload);
          }),
          loadSettings(),
        ]);
        if (run !== followRun) {
          unlisten();
          return;
        }
        unlistenFollow = unlisten;
        set({ offsetMs: followOffsets[deviceId] ?? 0 });
        await queueFollowCommand(() => followStart(sessionId));
      } catch (e) {
        if (run === followRun) get().stopFollow();
        throw e;
      }
    },

    stopFollow: () => {
      if (!get().follow) return;
      endFollow();
      void get().setMode(beforeFollow.mode);
    },

    chooseFollowProject: async (projectId) => {
      const itemId = get().follow?.itemId;
      if (!itemId) return;
      const run = followRun;
      const { followChoices } = await loadSettings();
      if (!isCurrent(run, itemId)) return;
      void updateSettings({
        followChoices: { ...followChoices, [itemId]: projectId },
      });
      patchFollow({ chosen: true });
      await loadFollowProject(projectId, () => isCurrent(run, itemId));
    },
  };
});
