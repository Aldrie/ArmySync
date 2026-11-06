import { beforeEach, expect, it, vi } from 'vitest';

import { useAppStore } from './app-store';
import { useEditorStore } from './editor-store';
import { usePlayerStore } from './player-store';
import * as library from '../domains/project';
import type { Project } from '../domains/project';

vi.mock('../domains/project', () => ({
  loadProject: vi.fn(),
  listProjects: vi.fn(() => Promise.resolve([])),
}));

vi.mock('./editor-store', () => ({
  useEditorStore: { getState: vi.fn() },
}));

vi.mock('./player-store', () => ({
  usePlayerStore: { getState: vi.fn() },
}));

const project = { id: 'p1', name: 'Song' } as Project;
const open = vi.fn(() => Promise.resolve());
const leave = vi.fn();
const app = useAppStore.getState;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(library.loadProject).mockResolvedValue(project);
  vi.mocked(usePlayerStore.getState).mockReturnValue({
    open,
    leave,
  } as unknown as ReturnType<typeof usePlayerStore.getState>);
  useAppStore.setState({ route: 'library', activeProject: null });
});

it('opens the player on the loaded project', async () => {
  await app().openPlayer('p1');
  expect(library.loadProject).toHaveBeenCalledWith('p1');
  expect(app().route).toBe('player');
  expect(app().activeProject).toBe(project);
  expect(open).toHaveBeenCalledWith(project);
});

it('leaves the player before opening the editor from it', async () => {
  useAppStore.setState({ route: 'player', activeProject: project });
  leave.mockImplementationOnce(() => expect(app().route).toBe('player'));
  await app().openProject('p1');
  expect(leave).toHaveBeenCalledOnce();
  expect(app().route).toBe('editor');
});

it('closes the player back to the library', () => {
  useAppStore.setState({ route: 'player', activeProject: project });
  app().closePlayer();
  expect(leave).toHaveBeenCalledOnce();
  expect(app().route).toBe('library');
  expect(app().activeProject).toBeNull();
  expect(library.listProjects).toHaveBeenCalled();
});

it('waits for a pending editor save before opening the player', async () => {
  let finishSave = () => {};
  const saveEffects = vi.fn(
    () => new Promise<void>((resolve) => (finishSave = resolve)),
  );
  vi.mocked(useEditorStore.getState).mockReturnValue({
    isDirty: true,
    saveEffects,
    resetEditor: vi.fn(),
  } as unknown as ReturnType<typeof useEditorStore.getState>);
  useAppStore.setState({ route: 'editor', activeProject: project });
  app().closeProject();

  const opening = app().openPlayer('p1');
  await Promise.resolve();
  await Promise.resolve();
  expect(library.loadProject).not.toHaveBeenCalled();
  expect(app().route).toBe('library');

  finishSave();
  await opening;
  expect(app().route).toBe('player');
});

it('drops an open overtaken by a newer one', async () => {
  const b = { id: 'b', name: 'B' } as Project;
  let finishA: (p: Project) => void = () => {};
  vi.mocked(library.loadProject)
    .mockReturnValueOnce(new Promise<Project>((r) => (finishA = r)))
    .mockResolvedValueOnce(b);

  const playing = app().openPlayer('a');
  await app().openProject('b');
  finishA(project);
  await playing;

  expect(app().route).toBe('editor');
  expect(app().activeProject).toBe(b);
  expect(open).not.toHaveBeenCalled();
});

it('drops a player open when the player is closed first', async () => {
  let finish: (p: Project) => void = () => {};
  vi.mocked(library.loadProject).mockReturnValueOnce(
    new Promise<Project>((r) => (finish = r)),
  );

  const playing = app().openPlayer('p1');
  app().closePlayer();
  finish(project);
  await playing;

  expect(app().route).toBe('library');
  expect(open).not.toHaveBeenCalled();
});

it('falls back to the library when opening the editor from the player fails', async () => {
  useAppStore.setState({ route: 'player', activeProject: project });
  vi.mocked(library.loadProject).mockRejectedValueOnce(new Error('disk'));

  await expect(app().openProject('p1')).rejects.toThrow('disk');
  expect(leave).toHaveBeenCalledOnce();
  expect(app().route).toBe('library');
  expect(app().activeProject).toBeNull();
});
