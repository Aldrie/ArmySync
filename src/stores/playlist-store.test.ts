import { beforeEach, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';

import { usePlaylistStore } from './playlist-store';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const invokeMock = vi.mocked(invoke);
const writes = () =>
  invokeMock.mock.calls.filter(([cmd]) => cmd === 'write_app_json');

beforeEach(() => {
  invokeMock.mockReset();
  usePlaylistStore.setState({ playlists: [], selectedId: null, loaded: false });
});

it('never writes after a failed load', async () => {
  invokeMock.mockRejectedValueOnce(new Error('disk'));
  await usePlaylistStore.getState().load();
  usePlaylistStore.getState().create('Mix');
  await Promise.resolve();
  expect(usePlaylistStore.getState().playlists).toHaveLength(1);
  expect(writes()).toHaveLength(0);
});

it('writes after a successful load of a missing file', async () => {
  invokeMock.mockResolvedValue(null);
  await usePlaylistStore.getState().load();
  usePlaylistStore.getState().create('  Mix  ');
  await vi.waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][1]).toEqual({
    name: 'playlists',
    value: { playlists: usePlaylistStore.getState().playlists },
  });
  expect(usePlaylistStore.getState().playlists[0].name).toBe('Mix');
});
