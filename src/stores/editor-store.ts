import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import { editorRefs } from './editor-refs';
import { sync, effectFile } from '../domains/effects';
import type { EffectInstance } from '../domains/effects';
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
  videoFilePath: string | null;
  videoDuration: number;
  isPlaying: boolean;
  effects: EffectInstance[];
  waveform: Float32Array | null;
  waveformLoading: boolean;
  volume: number;
  muted: boolean;
  zoomLevel: number;

  // Selection (multi-select)
  selectedEffectIds: string[];

  // Clipboard
  clipboard: EffectInstance[];

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

  // Effect CRUD
  selectEffect: (
    id: string | null,
    mode?: 'replace' | 'toggle' | 'range',
  ) => void;
  addEffect: (effect: EffectInstance) => void;
  removeEffect: (id: string) => void;
  updateEffect: (id: string, patch: Partial<EffectInstance>) => void;
  updateEffectParams: (
    id: string,
    params: Partial<Record<string, unknown>>,
  ) => void;
  moveEffect: (id: string, from: number, to: number) => void;
  resizeEffect: (id: string, edge: 'start' | 'end', newTime: number) => void;

  // Clipboard
  copySelection: () => void;
  pasteSelection: (atTime?: number) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;

  handleVideoLoad: () => Promise<void>;
  openVideoFile: () => Promise<void>;
  loadEffectFile: () => Promise<void>;
}

let nextEffectId = 1;

export function generateEffectId(): string {
  return `effect-${Date.now()}-${nextEffectId++}`;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  videoSrc: import.meta.env.DEV ? DEV_VIDEO_PATH : '',
  videoFilePath: null,
  videoDuration: 0,
  isPlaying: false,
  effects: [],
  waveform: null,
  waveformLoading: false,
  volume: DEFAULT_VOLUME,
  muted: false,
  zoomLevel: 0,
  currentTime: 0,

  selectedEffectIds: [],
  clipboard: [],

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

  selectEffect: (id, mode = 'replace') => {
    if (id === null) {
      set({ selectedEffectIds: [] });
      return;
    }

    const { selectedEffectIds, effects } = get();

    if (mode === 'toggle') {
      set({
        selectedEffectIds: selectedEffectIds.includes(id)
          ? selectedEffectIds.filter((sid) => sid !== id)
          : [...selectedEffectIds, id],
      });
    } else if (mode === 'range' && selectedEffectIds.length > 0) {
      const sorted = [...effects].sort((a, b) => a.from - b.from);
      const anchor = selectedEffectIds[selectedEffectIds.length - 1];
      const anchorIdx = sorted.findIndex((e) => e.id === anchor);
      const clickIdx = sorted.findIndex((e) => e.id === id);
      const lo = Math.min(anchorIdx, clickIdx);
      const hi = Math.max(anchorIdx, clickIdx);
      set({ selectedEffectIds: sorted.slice(lo, hi + 1).map((e) => e.id) });
    } else {
      set({ selectedEffectIds: [id] });
    }
  },

  addEffect: (effect) => {
    set((s) => ({ effects: [...s.effects, effect] }));
  },

  removeEffect: (id) => {
    set((s) => ({
      effects: s.effects.filter((e) => e.id !== id),
      selectedEffectIds: s.selectedEffectIds.filter((sid) => sid !== id),
    }));
  },

  updateEffect: (id, patch) => {
    set((s) => ({
      effects: s.effects.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },

  updateEffectParams: (id, params) => {
    set((s) => ({
      effects: s.effects.map((e) =>
        e.id === id ? { ...e, params: { ...e.params, ...params } } : e,
      ),
    }));
  },

  moveEffect: (id, from, to) => {
    set((s) => ({
      effects: s.effects.map((e) => (e.id === id ? { ...e, from, to } : e)),
    }));
  },

  resizeEffect: (id, edge, newTime) => {
    set((s) => ({
      effects: s.effects.map((e) => {
        if (e.id !== id) return e;
        if (edge === 'start') {
          return { ...e, from: Math.min(newTime, e.to - 0.1) };
        }
        return { ...e, to: Math.max(newTime, e.from + 0.1) };
      }),
    }));
  },

  copySelection: () => {
    const { selectedEffectIds, effects } = get();
    if (selectedEffectIds.length === 0) return;
    const selected = effects.filter((e) => selectedEffectIds.includes(e.id));
    set({ clipboard: selected.map((e) => ({ ...e })) });
  },

  pasteSelection: (atTime) => {
    const { clipboard, currentTime } = get();
    if (clipboard.length === 0) return;

    const insertAt = atTime ?? currentTime;
    const sorted = [...clipboard].sort((a, b) => a.from - b.from);
    const baseTime = sorted[0].from;

    const newIds: string[] = [];
    for (const effect of sorted) {
      const offset = effect.from - baseTime;
      const duration = effect.to - effect.from;
      const newEffect: EffectInstance = {
        ...effect,
        id: generateEffectId(),
        from: insertAt + offset,
        to: insertAt + offset + duration,
      };
      get().addEffect(newEffect);
      newIds.push(newEffect.id);
    }
    set({ selectedEffectIds: newIds });
  },

  deleteSelection: () => {
    const { selectedEffectIds } = get();
    if (selectedEffectIds.length === 0) return;
    set((s) => ({
      effects: s.effects.filter((e) => !selectedEffectIds.includes(e.id)),
      selectedEffectIds: [],
    }));
  },

  duplicateSelection: () => {
    const { selectedEffectIds, effects } = get();
    if (selectedEffectIds.length === 0) return;

    const selected = effects
      .filter((e) => selectedEffectIds.includes(e.id))
      .sort((a, b) => a.from - b.from);

    const firstStart = selected[0].from;
    const lastEnd = Math.max(...selected.map((e) => e.to));

    const newIds: string[] = [];
    for (const effect of selected) {
      const offset = effect.from - firstStart;
      const duration = effect.to - effect.from;
      const newEffect: EffectInstance = {
        ...effect,
        id: generateEffectId(),
        from: lastEnd + offset,
        to: lastEnd + offset + duration,
      };
      get().addEffect(newEffect);
      newIds.push(newEffect.id);
    }
    set({ selectedEffectIds: newIds });
  },

  handleVideoLoad: async () => {
    const el = editorRefs.video;
    if (!el) return;

    el.volume = get().volume;
    set({ videoDuration: el.duration });

    let filePath = get().videoFilePath;

    if (!filePath && import.meta.env.DEV) {
      try {
        filePath = await invoke<string>('resolve_path', {
          relative: '../public/example.mp4',
        });
      } catch (err) {
        console.error('Could not resolve dev video path:', err);
        return;
      }
    }

    if (filePath) {
      set({ waveformLoading: true });
      extractWaveform(filePath)
        .then((w) => set({ waveform: w, waveformLoading: false }))
        .catch((err) => {
          console.error(err);
          set({ waveformLoading: false });
        });
    }
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
        set({
          videoSrc: `asset://localhost/${selected}`,
          videoFilePath: selected,
        });
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

      const effects = await effectFile.parse(selected);
      set({ effects });
    } catch (err) {
      console.error('Failed to load effect file:', err);
    }
  },
}));
