import { beforeEach, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';

import { useAppStore } from './app-store';
import { editorRefs } from './editor-refs';
import { beginHistoryBatch, useEditorStore } from './editor-store';
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

const jellyfinSong = () =>
  createSongProject({
    id: 'p1',
    name: 'Show',
    mediaId: 'm1',
    now: 0,
    media: {
      type: 'video',
      duration: 6528,
      source: {
        type: 'jellyfin',
        itemId: 'it',
        mediaSourceId: 'ms',
        serverId: 'srv',
      },
    },
  });

const streamAt = (url: string) =>
  vi
    .mocked(invoke)
    .mockImplementation((cmd) =>
      Promise.resolve(cmd === 'jellyfin_open_stream' ? url : []),
    );

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

it('undoes and redoes one change at a time', async () => {
  await useEditorStore.getState().initFromProject(song());
  const store = useEditorStore.getState;
  const ids = () => store().effects.map((e) => e.id);

  store().addEffect({ id: 'a', type: 'color', from: 0, to: 1, params: {} });
  store().addEffect({ id: 'b', type: 'color', from: 1, to: 2, params: {} });

  store().undo();
  expect(ids()).toEqual(['a']);
  store().undo();
  expect(ids()).toEqual([]);
  expect(store().canUndo).toBe(false);

  store().redo();
  expect(ids()).toEqual(['a']);
  store().redo();
  expect(ids()).toEqual(['a', 'b']);
  expect(store().canRedo).toBe(false);
});

it('records one undo entry per history batch', async () => {
  await useEditorStore.getState().initFromProject(song());
  const store = useEditorStore.getState;
  store().addEffect({
    id: 'a',
    type: 'color',
    from: 0,
    to: 1,
    params: { color: '#000000' },
  });

  const endBatch = beginHistoryBatch();
  for (const color of ['#111111', '#222222', '#333333']) {
    store().updateEffectParams('a', { color });
  }
  endBatch();

  store().undo();
  expect(store().effects[0].params.color).toBe('#000000');
});

const color = (id: string, from: number, to: number) => ({
  id,
  type: 'color',
  from,
  to,
  params: { color: '#ffffff' },
});

const take = (startTime: number, chunk = 0, from = 4, to = 6) => ({
  id: 'take-1',
  chunk,
  startTime,
  effects: [color(`t${chunk}`, from, to)],
});

const stubVideo = () => {
  editorRefs.video = {
    duration: 120,
    currentTime: 30,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  } as unknown as HTMLVideoElement;
};

it('applies a remote take as one undo step', async () => {
  stubVideo();
  await useEditorStore.getState().initFromProject(song());
  const store = useEditorStore.getState;
  store().addEffect(color('a', 0, 10));

  expect(store().applyRemoteTake(take(2))).toBe(true);
  expect(store().effects.map((e) => [e.from, e.to])).toEqual([
    [0, 4],
    [4, 6],
    [6, 10],
  ]);
  expect(store().lastTakeStart()).toBe(2);

  store().undo();
  expect(store().effects).toEqual([color('a', 0, 10)]);
});

it('undoes the last take and parks the song at its start', async () => {
  stubVideo();
  await useEditorStore.getState().initFromProject(song());
  const store = useEditorStore.getState;
  store().addEffect(color('a', 0, 10));
  store().applyRemoteTake(take(2));
  useEditorStore.setState({ isPlaying: true });

  expect(store().undoRemoteTake()).toBe(2);
  expect(store().effects).toEqual([color('a', 0, 10)]);
  expect(editorRefs.video?.currentTime).toBe(2);
  expect(store().currentTime).toBe(2);
  expect(store().isPlaying).toBe(false);
  expect(store().lastTakeStart()).toBeNull();
});

it('does not undo a take once another edit came after it', async () => {
  stubVideo();
  await useEditorStore.getState().initFromProject(song());
  const store = useEditorStore.getState;
  store().applyRemoteTake(take(2));
  store().addEffect(color('b', 20, 30));
  const before = store().effects;

  expect(store().lastTakeStart()).toBeNull();
  expect(store().undoRemoteTake()).toBeNull();
  expect(store().effects).toBe(before);
  expect(editorRefs.video?.currentTime).toBe(30);
});

it('applies the chunks of one take as one undo step', async () => {
  stubVideo();
  await useEditorStore.getState().initFromProject(song());
  const store = useEditorStore.getState;
  store().addEffect(color('a', 0, 10));

  store().applyRemoteTake(take(2, 0, 2, 4));
  store().applyRemoteTake(take(2, 1, 4, 6));
  expect(store().effects.map((e) => [e.from, e.to])).toEqual([
    [0, 2],
    [2, 4],
    [4, 6],
    [6, 10],
  ]);
  expect(store().lastTakeStart()).toBe(2);

  store().undo();
  expect(store().effects).toEqual([color('a', 0, 10)]);
  expect(store().lastTakeStart()).toBeNull();
});

it('starts a new undo entry for a chunk that follows a manual edit', async () => {
  stubVideo();
  await useEditorStore.getState().initFromProject(song());
  const store = useEditorStore.getState;
  store().applyRemoteTake(take(2, 0, 2, 4));
  store().addEffect(color('b', 20, 30));
  store().applyRemoteTake(take(2, 1, 4, 6));
  expect(store().lastTakeStart()).toBe(2);

  store().undo();
  expect(store().effects.map((e) => e.id)).toEqual(['t0', 'b']);
});

it('refuses a remote take without an open project', () => {
  useEditorStore.getState().resetEditor();
  expect(useEditorStore.getState().applyRemoteTake(take(2))).toBe(false);
  expect(useEditorStore.getState().effects).toEqual([]);
});

it('streams a Jellyfin song', async () => {
  streamAt('http://127.0.0.1:1/n/v');
  await useEditorStore.getState().initFromProject(jellyfinSong());
  expect(invoke).toHaveBeenCalledWith('jellyfin_open_stream', {
    itemId: 'it',
    mediaSourceId: 'ms',
  });
  expect(useEditorStore.getState()).toMatchObject({
    videoSrc: 'http://127.0.0.1:1/n/v',
    mediaError: null,
  });
});

it('ignores a stream that opens after the editor was reset', async () => {
  let resolve: (url: string) => void = () => undefined;
  vi.mocked(invoke).mockImplementation((cmd) =>
    cmd === 'jellyfin_open_stream'
      ? new Promise((r) => {
          resolve = r;
        })
      : Promise.resolve([]),
  );
  const opening = useEditorStore.getState().initFromProject(jellyfinSong());
  useEditorStore.getState().resetEditor();
  vi.mocked(invoke).mockClear();
  resolve('late');
  await opening;
  expect(useEditorStore.getState()).toMatchObject({
    project: null,
    videoSrc: '',
  });
  expect(invoke).toHaveBeenCalledWith('jellyfin_close_stream');
});

it('opens the song even when Jellyfin is down', async () => {
  vi.mocked(invoke).mockImplementation((cmd) =>
    cmd === 'jellyfin_open_stream'
      ? // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Tauri invoke rejects with the Rust error string
        Promise.reject('error sending request')
      : Promise.resolve([]),
  );
  await useEditorStore.getState().initFromProject(jellyfinSong());
  expect(useEditorStore.getState()).toMatchObject({
    videoSrc: '',
    mediaError: 'error sending request',
  });
  expect(useEditorStore.getState().project?.id).toBe('p1');
});

it('stops the server stream when leaving the editor', async () => {
  streamAt('u');
  await useEditorStore.getState().initFromProject(jellyfinSong());
  useEditorStore.getState().resetEditor();
  expect(invoke).toHaveBeenCalledWith('jellyfin_close_stream');
});

it('loads the Jellyfin waveform', async () => {
  streamAt('u');
  editorRefs.video = { duration: 6528, volume: 1 } as HTMLVideoElement;
  await useEditorStore.getState().initFromProject(jellyfinSong());
  await useEditorStore.getState().handleVideoLoad();
  expect(invoke).toHaveBeenCalledWith('jellyfin_waveform', {
    projectId: 'p1',
    itemId: 'it',
    mediaSourceId: 'ms',
  });
});
