import { create } from 'zustand';

import { open } from '@tauri-apps/plugin-dialog';

import { editorRefs } from './editor-refs';
import { sync, effectFile } from '../domains/effects';
import type { IEffect } from '../domains/effects';
import { extractWaveform } from '../lib/audio';

const DEV_VIDEO_PATH = '/example.mp4';

interface EditorState {
  videoSrc: string;
  videoDuration: number;
  isPlaying: boolean;
  effects: IEffect[];
  waveform: Float32Array | null;

  /** Transient — consume via useTransientTime, never as a selector */
  currentTime: number;

  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seekDelta: (delta: number) => void;
  seekPercent: (percent: number) => void;
  tick: (time: number) => void;

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
    el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + delta));
  },

  seekPercent: (percent) => {
    const el = editorRefs.video;
    if (!el) return;
    el.currentTime = el.duration * (percent / 100);
  },

  tick: (time) => {
    set({ currentTime: time });
    sync(get().effects, time, (color) =>
      editorRefs.lightstick?.setColor(color),
    );
  },

  handleVideoLoad: () => {
    const el = editorRefs.video;
    if (!el) return;

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
