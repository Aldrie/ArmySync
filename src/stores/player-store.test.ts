import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';

import { playerRefs, usePlayerStore } from './player-store';
import { createSongProject } from '../domains/project';
import type { MediaEntry } from '../domains/project';
import {
  openSongSource,
  releaseSongSource,
} from '../domains/project/song-source';
import { loadSettings } from '../lib/settings';
import type { PlayerMode } from '../lib/settings';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve([])),
  convertFileSrc: (p: string) => p,
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: () => Promise.resolve('/data'),
  join: (...parts: string[]) => Promise.resolve(parts.join('/')),
}));

vi.mock('../domains/project/song-source', () => ({
  openSongSource: vi.fn(() =>
    Promise.resolve({ videoSrc: 'src', mediaError: null }),
  ),
  releaseSongSource: vi.fn(),
}));

vi.mock('../lib/settings', () => ({
  loadSettings: vi.fn(),
  updateSettings: vi.fn(() => Promise.resolve()),
}));

const song = (
  duration: number,
  media: MediaEntry = {
    file: 'media/m1.mp4',
    type: 'video',
    duration,
    source: { type: 'file', originalName: 'song.mp4' },
  },
) =>
  createSongProject({ id: 'p1', name: 'Song', mediaId: 'm1', now: 0, media });

const jellyfinSong = () =>
  song(60, {
    type: 'video',
    duration: 60,
    source: {
      type: 'jellyfin',
      itemId: 'it',
      mediaSourceId: 'ms',
      serverId: 'srv',
    },
  });

let nowMs = 0;
const advance = (seconds: number) => {
  nowMs += seconds * 1000;
};

const store = usePlayerStore.getState;

const openIn = async (playerMode: PlayerMode, project = song(30)) => {
  vi.mocked(loadSettings).mockResolvedValue({
    bleDelays: {},
    remoteLatencyMs: 0,
    playerMode,
  });
  await store().open(project);
  vi.mocked(invoke).mockClear();
};

const argsOf = (cmd: string) =>
  vi
    .mocked(invoke)
    .mock.calls.filter(([c]) => c === cmd)
    .map(([, args]) => args);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const fakeVideo = () =>
  ({
    currentTime: 0,
    duration: 30,
    volume: 1,
    muted: false,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  }) as unknown as HTMLVideoElement;

beforeEach(() => {
  nowMs = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  vi.mocked(invoke).mockClear();
  vi.mocked(openSongSource).mockClear();
  vi.mocked(releaseSongSource).mockClear();
});

afterEach(() => {
  store().leave();
  playerRefs.video = null;
  vi.restoreAllMocks();
});

it('starts the lights earlier by the offset', async () => {
  await openIn('lights');
  store().setOffset(120);
  store().seek(10);
  store().play();
  expect(argsOf('sync_play')).toEqual([{ time: expect.closeTo(9.88, 5) }]);
});

it('moves the lights at once when the offset is nudged mid-song', async () => {
  await openIn('lights');
  store().setOffset(120);
  store().seek(10);
  store().play();
  advance(2);
  store().nudgeOffset(10);
  expect(store().offsetMs).toBe(130);
  expect(argsOf('sync_seek').slice(-1)[0]).toEqual({
    time: expect.closeTo(11.87, 5),
  });
});

it('stops at the end and restarts from the top', async () => {
  await openIn('lights', song(30));
  store().play();
  advance(31);
  store().tickLights();
  expect(store()).toMatchObject({ isPlaying: false, currentTime: 30 });
  expect(invoke).toHaveBeenCalledWith('sync_pause');

  vi.mocked(invoke).mockClear();
  store().play();
  expect(vi.mocked(invoke).mock.calls).toEqual([
    ['sync_seek', { time: 0 }],
    ['sync_play', { time: 0 }],
  ]);
});

it('keeps playing a song of unknown length', async () => {
  await openIn('lights', song(0));
  store().play();
  advance(500);
  store().tickLights();
  expect(store().isPlaying).toBe(true);
  expect(store().currentTime).toBeCloseTo(500);
});

it('clamps seeks to the song', async () => {
  await openIn('lights', song(30));
  store().seek(3);
  store().seekDelta(-10);
  expect(store().currentTime).toBe(0);
  store().seek(25);
  store().seekDelta(10);
  expect(store().currentTime).toBe(30);
});

it('resyncs the lights only when the video drifts past 40 ms', async () => {
  playerRefs.video = fakeVideo();
  await openIn('video');
  expect(store()).toMatchObject({ ready: true, videoSrc: 'src' });
  store().setOffset(120);
  store().seek(5);
  store().play();
  await flush();
  vi.mocked(invoke).mockClear();

  store().onVideoTime(5.1);
  expect(argsOf('sync_seek')).toEqual([{ time: expect.closeTo(4.98, 5) }]);
  store().onVideoTime(5.12);
  expect(argsOf('sync_seek')).toHaveLength(1);
});

it('pauses the lights while the video stalls', async () => {
  playerRefs.video = fakeVideo();
  await openIn('video');
  store().play();
  await flush();
  store().onVideoStalled();
  expect(invoke).toHaveBeenCalledWith('sync_pause');
  expect(store().isPlaying).toBe(true);
});

it('opens the Jellyfin stream only in Video and clears up on leave', async () => {
  await openIn('lights', jellyfinSong());
  expect(openSongSource).not.toHaveBeenCalled();

  await store().setMode('video');
  expect(openSongSource).toHaveBeenCalledTimes(1);

  await store().setMode('lights');
  expect(releaseSongSource).toHaveBeenCalledTimes(1);

  vi.mocked(invoke).mockClear();
  store().leave();
  expect(invoke).toHaveBeenCalledWith('sync_pause');
  expect(invoke).toHaveBeenCalledWith('sync_set_effects', { effects: [] });
  expect(releaseSongSource).toHaveBeenCalledTimes(2);
});

it('stops a song of unknown length where the video ended', async () => {
  const video = fakeVideo();
  playerRefs.video = video;
  await openIn('video', song(0));
  store().play();
  await flush();
  video.currentTime = 42;
  store().onVideoEnded();
  expect(store()).toMatchObject({ isPlaying: false, currentTime: 42 });
  store().seekDelta(-10);
  expect(store().currentTime).toBe(32);
});

it('stops playing when the video comes back with an error', async () => {
  await openIn('lights', jellyfinSong());
  store().play();
  vi.mocked(openSongSource).mockResolvedValueOnce({
    videoSrc: '',
    mediaError: 'Jellyfin server unreachable',
  });
  await store().setMode('video');
  expect(store()).toMatchObject({
    isPlaying: false,
    mediaError: 'Jellyfin server unreachable',
  });
});

it('pauses the video before releasing it for Lights only', async () => {
  const pause = vi.fn();
  playerRefs.video = Object.assign(fakeVideo(), { pause });
  await openIn('video');
  store().play();
  await flush();
  await store().setMode('lights');
  expect(pause).toHaveBeenCalled();
  expect(pause.mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(releaseSongSource).mock.invocationCallOrder[0],
  );
});
