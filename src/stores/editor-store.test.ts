import { beforeEach, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';

import { useAppStore } from './app-store';
import { editorRefs } from './editor-refs';
import { useEditorStore } from './editor-store';
import {
  createSongProject,
  getSongEffects,
  getSongMedia,
} from '../domains/project';
import type { Project } from '../domains/project';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve([])),
  convertFileSrc: (p: string) => p,
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: () => Promise.resolve('/data'),
  join: (...parts: string[]) => Promise.resolve(parts.join('/')),
}));

const song = () =>
  createSongProject({
    id: 'p1',
    name: 'Song',
    mediaId: 'm1',
    media: {
      file: 'media/m1.mp3',
      type: 'audio',
      duration: 0,
      source: { type: 'file', originalName: 'song.mp3' },
    },
    now: 0,
  });

const projectWrites = () =>
  vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'write_project');

beforeEach(() => {
  vi.mocked(invoke).mockClear();
});

it('keeps effects and stamped duration when saves overlap', async () => {
  await useEditorStore.getState().initFromProject(song());
  useEditorStore.setState({
    effects: [{ id: 'e1', type: 'color', from: 0, to: 1, params: {} }],
  });
  editorRefs.video = { duration: 120, volume: 1 } as HTMLVideoElement;

  const save = useEditorStore.getState().saveEffects();
  await useEditorStore.getState().handleVideoLoad();
  await save;
  await new Promise((resolve) => setTimeout(resolve, 0));

  const writes = projectWrites();
  const lastWrite = (writes[writes.length - 1]?.[1] as { project: Project })
    .project;
  const inMemory = useEditorStore.getState().project;

  for (const project of [lastWrite, inMemory]) {
    if (!project) throw new Error('missing project');
    expect(getSongMedia(project)?.media.duration).toBe(120);
    expect(getSongEffects(project)).toHaveLength(1);
  }
});

it('does not autosave a song after it is closed', async () => {
  vi.useFakeTimers();
  await useEditorStore.getState().initFromProject(song());
  useEditorStore
    .getState()
    .addEffect({ id: 'e1', type: 'color', from: 0, to: 1, params: {} });

  useAppStore.getState().closeProject();
  await vi.advanceTimersByTimeAsync(0);
  expect(projectWrites()).toHaveLength(1);

  await vi.advanceTimersByTimeAsync(5000);
  expect(projectWrites()).toHaveLength(1);
  expect(useEditorStore.getState().project).toBeNull();
  vi.useRealTimers();
});
