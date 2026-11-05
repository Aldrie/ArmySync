import { createId } from '@paralleldrive/cuid2';
import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';

import { editorRefs } from './editor-refs';
import type { EffectInstance } from '../domains/effects';
import {
  getSongEffects,
  getSongMedia,
  projectFilePath,
  projectFileUrl,
  saveProject,
  withSongEffects,
  withSongMediaDuration,
} from '../domains/project';
import type { MediaType, Project } from '../domains/project';
import { extractWaveform } from '../lib/audio';

const DEFAULT_VOLUME = 0.25;
const FRAME_DURATION = 1 / 24;
const MAX_HISTORY = 10;
const AUTO_SAVE_DELAY = 2000;

function cloneEffects(effects: EffectInstance[]): EffectInstance[] {
  return effects.map((e) => ({ ...e, params: { ...e.params } }));
}

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
  project: Project | null;
  isDirty: boolean;

  videoSrc: string;
  mediaType: MediaType | null;
  videoDuration: number;
  isPlaying: boolean;
  effects: EffectInstance[];
  waveform: Float32Array | null;
  waveformLoading: boolean;
  volume: number;
  muted: boolean;
  zoomLevel: number;

  selectedEffectIds: string[];

  clipboard: EffectInstance[];

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
  moveEffects: (moves: Array<{ id: string; from: number; to: number }>) => void;
  resizeEffect: (id: string, edge: 'start' | 'end', newTime: number) => void;

  copySelection: () => void;
  pasteSelection: (atTime?: number) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;

  _past: EffectInstance[][];
  _future: EffectInstance[][];
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  initFromProject: (project: Project) => Promise<void>;
  saveEffects: () => Promise<void>;
  resetEditor: () => void;

  handleVideoLoad: () => Promise<void>;
}

export function generateEffectId(): string {
  return createId();
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSave(save: () => Promise<void>) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => void save(), AUTO_SAVE_DELAY);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  isDirty: false,

  videoSrc: '',
  mediaType: null,
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

  _past: [],
  _future: [],
  canUndo: false,
  canRedo: false,

  pushHistory: () => {
    const past = [...get()._past, cloneEffects(get().effects)].slice(
      -MAX_HISTORY,
    );
    set({
      _past: past,
      _future: [],
      canUndo: true,
      canRedo: false,
      isDirty: true,
    });
    scheduleAutoSave(get().saveEffects);
  },

  undo: () => {
    const { _past, _future, effects } = get();
    const previous = _past[_past.length - 1];
    if (!previous) return;
    set({
      effects: previous,
      _past: _past.slice(0, -1),
      _future: [cloneEffects(effects), ..._future],
      canUndo: _past.length > 1,
      canRedo: true,
      selectedEffectIds: [],
      isDirty: true,
    });
    scheduleAutoSave(get().saveEffects);
  },

  redo: () => {
    const { _past, _future, effects } = get();
    const next = _future[0];
    if (!next) return;
    set({
      effects: next,
      _past: [..._past, cloneEffects(effects)],
      _future: _future.slice(1),
      canUndo: true,
      canRedo: _future.length > 1,
      selectedEffectIds: [],
      isDirty: true,
    });
    scheduleAutoSave(get().saveEffects);
  },

  play: () => {
    const el = editorRefs.video;
    el?.play();
    set({ isPlaying: true });
    void invoke('sync_play', { time: el?.currentTime ?? 0 });
  },

  pause: () => {
    editorRefs.video?.pause();
    set({ isPlaying: false });
    void invoke('sync_pause');
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
    void invoke('sync_seek', { time });
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
    void invoke('sync_seek', { time });
  },

  tick: (time) => {
    set({ currentTime: time });
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
    get().pushHistory();
    set((s) => ({ effects: [...s.effects, effect] }));
  },

  removeEffect: (id) => {
    get().pushHistory();
    set((s) => ({
      effects: s.effects.filter((e) => e.id !== id),
      selectedEffectIds: s.selectedEffectIds.filter((sid) => sid !== id),
    }));
  },

  updateEffect: (id, patch) => {
    get().pushHistory();
    set((s) => ({
      effects: s.effects.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },

  updateEffectParams: (id, params) => {
    get().pushHistory();
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

  moveEffects: (moves) => {
    const lookup = new Map(moves.map((m) => [m.id, m]));
    set((s) => ({
      effects: s.effects.map((e) => {
        const m = lookup.get(e.id);
        return m ? { ...e, from: m.from, to: m.to } : e;
      }),
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

    get().pushHistory();

    const insertAt = atTime ?? currentTime;
    const sorted = [...clipboard].sort((a, b) => a.from - b.from);
    const baseTime = sorted[0].from;

    const newEffects: EffectInstance[] = [];
    for (const effect of sorted) {
      const offset = effect.from - baseTime;
      const duration = effect.to - effect.from;
      newEffects.push({
        ...effect,
        id: generateEffectId(),
        from: insertAt + offset,
        to: insertAt + offset + duration,
      });
    }
    set((s) => ({
      effects: [...s.effects, ...newEffects],
      selectedEffectIds: newEffects.map((e) => e.id),
    }));
  },

  deleteSelection: () => {
    const { selectedEffectIds } = get();
    if (selectedEffectIds.length === 0) return;
    get().pushHistory();
    set((s) => ({
      effects: s.effects.filter((e) => !selectedEffectIds.includes(e.id)),
      selectedEffectIds: [],
    }));
  },

  duplicateSelection: () => {
    const { selectedEffectIds, effects } = get();
    if (selectedEffectIds.length === 0) return;

    get().pushHistory();

    const selected = effects
      .filter((e) => selectedEffectIds.includes(e.id))
      .sort((a, b) => a.from - b.from);

    const firstStart = selected[0].from;
    const lastEnd = Math.max(...selected.map((e) => e.to));

    const newEffects: EffectInstance[] = [];
    for (const effect of selected) {
      const offset = effect.from - firstStart;
      const duration = effect.to - effect.from;
      newEffects.push({
        ...effect,
        id: generateEffectId(),
        from: lastEnd + offset,
        to: lastEnd + offset + duration,
      });
    }
    set((s) => ({
      effects: [...s.effects, ...newEffects],
      selectedEffectIds: newEffects.map((e) => e.id),
    }));
  },

  initFromProject: async (project) => {
    const song = getSongMedia(project);
    const videoSrc = song
      ? await projectFileUrl(project.id, song.media.file)
      : '';
    const effects = getSongEffects(project);

    set({
      project,
      isDirty: false,
      videoSrc,
      mediaType: song?.media.type ?? null,
      effects,
      selectedEffectIds: [],
      clipboard: [],
      _past: [],
      _future: [],
      canUndo: false,
      canRedo: false,
      waveform: null,
      waveformLoading: false,
    });
  },

  saveEffects: async () => {
    const { project, effects } = get();
    if (!project) return;

    try {
      await persist(withSongEffects(project, effects));
      set({ isDirty: false });
    } catch (err) {
      console.error('Failed to save effects:', err);
    }
  },

  resetEditor: () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    set({
      project: null,
      isDirty: false,
      videoSrc: '',
      mediaType: null,
      videoDuration: 0,
      isPlaying: false,
      effects: [],
      waveform: null,
      waveformLoading: false,
      currentTime: 0,
      selectedEffectIds: [],
      clipboard: [],
      _past: [],
      _future: [],
      canUndo: false,
      canRedo: false,
    });
  },

  handleVideoLoad: async () => {
    const el = editorRefs.video;
    if (!el) return;

    el.volume = get().volume;
    set({ videoDuration: el.duration });

    const { project } = get();
    const song = project && getSongMedia(project);
    if (!project || !song) return;

    if (song.media.duration === 0 && Number.isFinite(el.duration)) {
      persist(withSongMediaDuration(project, el.duration)).catch((err) =>
        console.error('Failed to save media duration:', err),
      );
    }

    set({ waveformLoading: true });
    try {
      const path = await projectFilePath(project.id, song.media.file);
      const waveform = await extractWaveform(path);
      if (get().project?.id !== project.id) return;
      set({ waveform, waveformLoading: false });
    } catch (err) {
      console.error(err);
      if (get().project?.id === project.id) set({ waveformLoading: false });
    }
  },
}));

async function persist(next: Project) {
  useEditorStore.setState({ project: next });
  const saved = await saveProject(next);
  if (useEditorStore.getState().project === next) {
    useEditorStore.setState({ project: saved });
  }
}

function syncEffectsToRust(effects: EffectInstance[]) {
  const payload = effects.map((e) => ({
    from: e.from,
    to: e.to,
    type: e.type,
    params: e.params,
  }));
  void invoke('sync_set_effects', { effects: payload });
}

useEditorStore.subscribe((state, prev) => {
  if (state.effects !== prev.effects) {
    syncEffectsToRust(state.effects);
  }
});
