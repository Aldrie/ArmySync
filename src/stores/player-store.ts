import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';

import { syncEffectsToRust } from './editor-store';
import { getSongEffects, getSongMedia } from '../domains/project';
import type { Project } from '../domains/project';
import {
  openSongSource,
  releaseSongSource,
} from '../domains/project/song-source';
import { loadSettings, updateSettings } from '../lib/settings';
import type { PlayerMode } from '../lib/settings';

const DEFAULT_VOLUME = 0.25;
const MAX_OFFSET_MS = 1000;
const OFFSET_STEP_MS = 10;
const RESYNC_THRESHOLD = 0.04;

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
  onVideoStalled: () => void;
  onVideoResumed: () => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
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

  return {
    ...session,
    mode: 'video',
    volume: DEFAULT_VOLUME,
    muted: false,

    open: async (project) => {
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
      void invoke('sync_pause');
      syncEffectsToRust([]);
      releaseSongSource();
      running = false;
      clockSeek(0);
      set(session);
    },

    setMode: async (mode) => {
      if (mode === get().mode) return;
      void updateSettings({ playerMode: mode });
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
      if (get().isPlaying) get().pause();
      else get().play();
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
    },

    seekDelta: (delta) => {
      get().seek(clockTime() + delta);
    },

    setOffset: (ms) => {
      const clamped = Math.max(-MAX_OFFSET_MS, Math.min(MAX_OFFSET_MS, ms));
      set({ offsetMs: Math.round(clamped / OFFSET_STEP_MS) * OFFSET_STEP_MS });
      if (get().isPlaying)
        void invoke('sync_seek', { time: engineTime(clockTime()) });
    },

    nudgeOffset: (deltaMs) => {
      get().setOffset(get().offsetMs + deltaMs);
    },

    tickLights: () => {
      const { duration, currentTime } = get();
      const time = clockTime();
      if (duration > 0 && time >= duration) {
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
  };
});
