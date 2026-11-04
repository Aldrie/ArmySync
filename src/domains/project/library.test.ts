import { beforeEach, describe, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';

import { createSong, listProjects, saveProject } from './library';
import { createSongProject } from './model';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => p,
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: () => Promise.resolve('/data'),
  join: (...parts: string[]) => Promise.resolve(parts.join('/')),
}));

const invokeMock = vi.mocked(invoke);

const project = (id: string) =>
  createSongProject({
    id,
    name: id,
    mediaId: 'm1',
    media: {
      file: 'media/m1.mp4',
      type: 'video',
      duration: 0,
      source: { type: 'file', originalName: 'song.mp4' },
    },
    now: 0,
  });

beforeEach(() => {
  invokeMock.mockReset();
});

describe('createSong', () => {
  it('cleans up on failure', async () => {
    invokeMock.mockImplementation((cmd) =>
      cmd === 'import_media'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(),
    );
    await expect(
      createSong({ name: 'Song', source: { type: 'file', path: '/a/b.mp4' } }),
    ).rejects.toThrow('boom');
    const importCall = invokeMock.mock.calls.find(
      ([cmd]) => cmd === 'import_media',
    );
    const { projectId } = importCall?.[1] as { projectId: string };
    expect(invokeMock).toHaveBeenCalledWith('delete_project', {
      id: projectId,
    });
  });
});

describe('saveProject', () => {
  it('serializes writes', async () => {
    const order: number[] = [];
    let call = 0;
    invokeMock.mockImplementation(async () => {
      const n = ++call;
      if (n === 1) await new Promise((r) => setTimeout(r, 20));
      order.push(n);
    });
    const [a, b] = await Promise.all([
      saveProject(project('p1')),
      saveProject(project('p2')),
    ]);
    expect(order).toEqual([1, 2]);
    expect(b.updatedAt).toBeGreaterThanOrEqual(a.updatedAt);
  });

  it('keeps running after a rejected write', async () => {
    invokeMock
      .mockRejectedValueOnce(new Error('disk'))
      .mockResolvedValueOnce(undefined);
    const first = saveProject(project('p1'));
    const second = saveProject(project('p2'));
    await expect(first).rejects.toThrow('disk');
    await expect(second).resolves.toMatchObject({ id: 'p2' });
  });
});

describe('listProjects', () => {
  it('sorts by updatedAt desc', async () => {
    invokeMock.mockResolvedValue([
      { id: 'a', kind: 'song', name: 'A', updatedAt: 1 },
      { id: 'b', kind: 'song', name: 'B', updatedAt: 3 },
      { id: 'c', kind: 'song', name: 'C', updatedAt: 2 },
    ]);
    const ids = (await listProjects()).map((p) => p.id);
    expect(ids).toEqual(['b', 'c', 'a']);
  });
});
