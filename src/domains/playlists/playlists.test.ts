import { describe, expect, it } from 'vitest';

import {
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  removeFromPlaylist,
  renamePlaylist,
  resolvePlaylist,
  type Playlist,
} from './playlists';
import type { ProjectSummary } from '../project';

const playlist = (id: string, projectIds: string[] = []): Playlist => ({
  id,
  name: id,
  projectIds,
  createdAt: 0,
});

const summary = (id: string): ProjectSummary => ({
  id,
  kind: 'song',
  name: id,
  updatedAt: 0,
});

describe('playlists', () => {
  it('createPlaylist appends a new empty playlist', () => {
    expect(createPlaylist([], { id: 'a', name: 'Mix', now: 5 })).toEqual([
      { id: 'a', name: 'Mix', projectIds: [], createdAt: 5 },
    ]);
  });

  it('addToPlaylist twice keeps one id', () => {
    const list = addToPlaylist(
      addToPlaylist([playlist('a')], 'a', 'p1'),
      'a',
      'p1',
    );
    expect(list[0].projectIds).toEqual(['p1']);
  });

  it('removeFromPlaylist drops the id', () => {
    expect(
      removeFromPlaylist([playlist('a', ['p1', 'p2'])], 'a', 'p1')[0]
        .projectIds,
    ).toEqual(['p2']);
  });

  it('resolvePlaylist keeps playlist order and drops orphans', () => {
    const projects = [summary('p1'), summary('p2'), summary('p3')];
    const resolved = resolvePlaylist(
      playlist('a', ['p3', 'gone', 'p1']),
      projects,
    );
    expect(resolved.map((p) => p.id)).toEqual(['p3', 'p1']);
  });

  it('deletePlaylist leaves the others', () => {
    expect(
      deletePlaylist([playlist('a'), playlist('b')], 'a').map((p) => p.id),
    ).toEqual(['b']);
  });

  it('renamePlaylist changes only the target', () => {
    const list = renamePlaylist([playlist('a'), playlist('b')], 'a', 'New');
    expect(list.map((p) => p.name)).toEqual(['New', 'b']);
  });

  it('every function returns a new array and leaves the input untouched', () => {
    const input = [playlist('a', ['p1'])];
    const snapshot = structuredClone(input);
    const results = [
      createPlaylist(input, { id: 'b', name: 'b', now: 0 }),
      renamePlaylist(input, 'a', 'x'),
      deletePlaylist(input, 'a'),
      addToPlaylist(input, 'a', 'p2'),
      removeFromPlaylist(input, 'a', 'p1'),
    ];
    for (const result of results) expect(result).not.toBe(input);
    expect(input).toEqual(snapshot);
  });
});
