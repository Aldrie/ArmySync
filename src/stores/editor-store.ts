import { create } from 'zustand';

import { open } from '@tauri-apps/plugin-dialog';

import { editorRefs } from './editor-refs';
import { sync, effectFile } from '../domains/effects';
import type { IEffect } from '../domains/effects';
import { extractWaveform } from '../lib/audio';

const DEV_VIDEO_PATH = '/example.mp4';
const DEFAULT_VOLUME = 0.25;
const FRAME_DURATION = 1 / 24;

function seekStepFromZoom(zoom: number): number {
  if (zoom >= 90) return FRAME_DURATION;
  return Math.max(1, Math.round((100 - zoom) / 10));
}

function shiftMultiplier(step: number): number {
  if (step <= FRAME_DURATION) return 8;
  if (step <= 1) return 2;
  return 1.5;
}

interface EditorState {
  videoSrc: string;
  videoDuration: number;
  isPlaying: boolean;
  effects: IEffect[];
  waveform: Float32Array | null;
  volume: number;
  muted: boolean;
  zoomLevel: number;

  /** Transient — consume via useTransientTime, never as a selector */
  currentTime: number;

  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seekDelta: (delta: number) => void;
  seekStep: (direction: 1 | -1, fast?: boolean) => void;
  seekPercent: (percent: number) => void;
  tick: (time: number) => void;

  setVolume: (value: number) => void;
  adjustVolume: (delta: number) => void;
  toggleMute: () => void;
  setZoomLevel: (value: number) => void;

  handleVideoLoad: () => void;
  openVideoFile: () => Promise<void>;
  loadEffectFile: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  videoSrc: import.meta.env.DEV ? DEV_VIDEO_PATH : '',
  videoDuration: 0,
  isPlaying: false,
  effects: [],
  waveform: null,
  volume: DEFAULT_VOLUME,
  muted: false,
  zoomLevel: 0,
  currentTime: 0,

  play: () => {
    editorRefs.video?.play();
    set({ isPlaying: true });
  },

  pause: () => {
    editorRefs.video?.pause();
    set({ isPlaying: false });
  },

  togglePlayPause: () => {
    const { isPlaying, play, pause } = get();
    if (isPlaying) pause();
    else play();
  },

  seekDelta: (delta) => {
    const el = editorRefs.video;
    if (!el) return;
    const time = Math.max(0, Math.min(el.duration, el.currentTime + delta));
    el.currentTime = time;
    get().tick(time);
  },

  seekStep: (direction, fast) => {
    const step = seekStepFromZoom(get().zoomLevel);
    get().seekDelta(direction * step * (fast ? shiftMultiplier(step) : 1));
  },

  seekPercent: (percent) => {
    const el = editorRefs.video;
    if (!el) return;
    const time = el.duration * (percent / 100);
    el.currentTime = time;
    get().tick(time);
  },

  tick: (time) => {
    set({ currentTime: time });
    sync(get().effects, time, (color) =>
      editorRefs.lightstick?.setColor(color),
    );
  },

  setVolume: (value) => {
    const el = editorRefs.video;
    const clamped = Math.max(0, Math.min(1, value));
    set({ volume: clamped, muted: clamped === 0 });
    if (el) {
      el.volume = clamped;
      el.muted = clamped === 0;
    }
  },

  adjustVolume: (delta) => {
    get().setVolume(get().volume + delta);
  },

  toggleMute: () => {
    const el = editorRefs.video;
    const next = !get().muted;
    set({ muted: next });
    if (el) el.muted = next;
  },

  setZoomLevel: (value) => {
    set({ zoomLevel: value });
  },

  handleVideoLoad: () => {
    const el = editorRefs.video;
    if (!el) return;

    el.volume = get().volume;
    set({ videoDuration: el.duration });

    const src = el.currentSrc || el.src;
    extractWaveform(src)
      .then((w) => set({ waveform: w }))
      .catch(console.error);
  },

  openVideoFile: async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Video Files', extensions: ['mp4', 'webm', 'mkv', 'avi'] },
        ],
      });

      if (selected) {
        set({ videoSrc: `asset://localhost/${selected}` });
      }
    } catch (err) {
      console.error('Failed to open video:', err);
    }
  },

  loadEffectFile: async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Effect Files', extensions: ['async', 'txt'] }],
      });

      if (!selected) return;

      const fileString = await effectFile.read(selected);
      const effects = effectFile.parseString(fileString);
      set({ effects });
    } catch (err) {
      console.error('Failed to load effect file:', err);
    }
  },
}));
