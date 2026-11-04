import { createId } from '@paralleldrive/cuid2';
import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';

import * as playlists from '../domains/playlists';
import type { Playlist } from '../domains/playlists';

interface PlaylistState {
  playlists: Playlist[];
  selectedId: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  create: (name: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  add: (id: string, projectId: string) => void;
  removeSong: (id: string, projectId: string) => void;
  select: (id: string | null) => void;
}

const parsePlaylists = (value: unknown): Playlist[] => {
  if (value === null) return [];
  const list = (value as { playlists?: unknown }).playlists;
  if (!Array.isArray(list)) throw new Error('Invalid playlists file');
  return list as Playlist[];
};

let writeQueue: Promise<void> = Promise.resolve();

export const usePlaylistStore = create<PlaylistState>((set, get) => {
  const commit = (next: Playlist[]) => {
    set({ playlists: next });
    // Writing before a successful load would overwrite the file with a partial list.
    if (!get().loaded) return;
    writeQueue = writeQueue
      .then(() =>
        invoke<void>('write_app_json', {
          name: 'playlists',
          value: { playlists: next },
        }),
      )
      .catch((e: unknown) => console.error('Failed to save playlists:', e));
  };

  return {
    playlists: [],
    selectedId: null,
    loaded: false,

    load: async () => {
      if (get().loaded) return;
      try {
        const value = await invoke<unknown>('read_app_json', {
          name: 'playlists',
        });
        set({ playlists: parsePlaylists(value), loaded: true });
      } catch (e) {
        console.error('Failed to load playlists:', e);
      }
    },

    create: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      commit(
        playlists.createPlaylist(get().playlists, {
          id: createId(),
          name: trimmed,
          now: Date.now(),
        }),
      );
    },

    rename: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      commit(playlists.renamePlaylist(get().playlists, id, trimmed));
    },

    remove: (id) => {
      if (get().selectedId === id) set({ selectedId: null });
      commit(playlists.deletePlaylist(get().playlists, id));
    },

    add: (id, projectId) => {
      commit(playlists.addToPlaylist(get().playlists, id, projectId));
    },

    removeSong: (id, projectId) => {
      commit(playlists.removeFromPlaylist(get().playlists, id, projectId));
    },

    select: (id) => {
      set({ selectedId: id });
    },
  };
});
