import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { EventCallback } from '@tauri-apps/api/event';

import { playerRefs, usePlayerStore } from './player-store';
import {
  followStart,
  followStop,
  playOnSession,
  sessionCommand,
} from '../domains/jellyfin/api';
import type {
  CastDevice,
  FollowEvent,
  NowPlaying,
} from '../domains/jellyfin/api';
import {
  createSongProject,
  listProjects,
  loadProject,
  withSongEffects,
} from '../domains/project';
import type { MediaEntry, Project } from '../domains/project';
import {
  openSongSource,
  releaseSongSource,
} from '../domains/project/song-source';
import { loadSettings, updateSettings } from '../lib/settings';
import type { PlayerMode, Settings } from '../lib/settings';

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

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

vi.mock('../domains/jellyfin/api', () => ({
  followStart: vi.fn(() => Promise.resolve()),
  followStop: vi.fn(() => Promise.resolve()),
  playOnSession: vi.fn(() => Promise.resolve()),
  sessionCommand: vi.fn(() => Promise.resolve()),
}));

vi.mock('../domains/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../domains/project')>()),
  listProjects: vi.fn(),
  loadProject: vi.fn(),
}));

vi.mock('../lib/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/settings')>()),
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

const settings = (patch: Partial<Settings> = {}): Settings => ({
  bleDelays: {},
  remoteLatencyMs: 0,
  playerMode: 'video',
  followOffsets: {},
  followChoices: {},
  ...patch,
});

const openIn = async (
  playerMode: PlayerMode,
  project = song(30),
  patch: Partial<Settings> = {},
) => {
  vi.mocked(loadSettings).mockResolvedValue(settings({ playerMode, ...patch }));
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

const unlisten = vi.fn();

let emitFollow: (payload: FollowEvent) => void = () => undefined;

beforeEach(() => {
  nowMs = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  vi.clearAllMocks();
  vi.mocked(listen).mockImplementation((event, handler) => {
    const onFollow = handler as EventCallback<FollowEvent>;
    emitFollow = (payload) => onFollow({ event, id: 0, payload });
    return Promise.resolve(unlisten);
  });
});

afterEach(() => {
  store().leave();
  playerRefs.video = null;
  vi.restoreAllMocks();
});

it('pauses lights left playing before parking them at the start', async () => {
  vi.mocked(loadSettings).mockResolvedValue(settings({ playerMode: 'lights' }));
  await store().open(song(30));
  const cmds = vi.mocked(invoke).mock.calls.map(([c]) => c);
  expect(cmds).toContain('sync_pause');
  expect(cmds.indexOf('sync_pause')).toBeLessThan(cmds.indexOf('sync_seek'));
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

it('stops everything when the video errors mid-play', async () => {
  playerRefs.video = fakeVideo();
  await openIn('video');
  store().play();
  await flush();
  store().onVideoError();
  expect(store()).toMatchObject({
    isPlaying: false,
    mediaError: 'The video stream stopped.',
  });
  expect(invoke).toHaveBeenCalledWith('sync_pause');
});

it('ignores a video error after the source was released', async () => {
  await openIn('video');
  await store().setMode('lights');
  store().onVideoError();
  expect(store().mediaError).toBeNull();
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

const tvSong = (id: string, itemId: string, updatedAt: number): Project =>
  withSongEffects(
    createSongProject({
      id,
      name: id,
      mediaId: 'm1',
      now: updatedAt,
      media: {
        type: 'video',
        duration: 300,
        source: {
          type: 'jellyfin',
          itemId,
          mediaSourceId: 'ms1',
          serverId: 'srv',
        },
      },
    }),
    [{ id: `e-${id}`, type: 'solid', from: 0, to: 10, params: { tag: id } }],
  );

const effectsOf = (id: string) => ({
  effects: [{ from: 0, to: 10, type: 'solid', params: { tag: id } }],
});

const shows = (...entries: [string, string, number][]) => {
  vi.mocked(listProjects).mockResolvedValue(
    entries
      .map(([id, itemId, updatedAt]) => ({
        id,
        kind: 'song' as const,
        name: id,
        updatedAt,
        jellyfinItemId: itemId,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt),
  );
  vi.mocked(loadProject).mockImplementation((id) => {
    const entry = entries.find(([projectId]) => projectId === id);
    return entry
      ? Promise.resolve(tvSong(...entry))
      : Promise.reject(new Error(id));
  });
};

const tv = (patch: Partial<NowPlaying> = {}): CastDevice => ({
  sessionId: 's1',
  deviceId: 'tv1',
  deviceName: 'Living room TV',
  nowPlaying: {
    itemId: 'i1',
    mediaSourceId: 'ms1',
    title: 'Dynamite',
    positionS: 100,
    paused: false,
    ...patch,
  },
});

const idleTv = (): CastDevice => ({ ...tv(), nowPlaying: null });

const report = (
  patch: Partial<Extract<FollowEvent, { kind: 'report' }>> = {},
): FollowEvent => ({
  kind: 'report',
  sessionId: 's1',
  itemId: 'i1',
  mediaSourceId: 'ms1',
  title: 'Dynamite',
  positionS: 100,
  paused: false,
  ...patch,
});

const lastEffects = () => argsOf('sync_set_effects').slice(-1)[0];

const emit = async (event: FollowEvent) => {
  emitFollow(event);
  await flush();
};

const follow = async (session = tv(), patch: Partial<Settings> = {}) => {
  await openIn('video', song(30), patch);
  await store().startFollow(session);
  if (session.nowPlaying) await emit(report(session.nowPlaying));
  vi.clearAllMocks();
};

it('follows a playing TV in Lights only without saving the mode', async () => {
  shows(['p1', 'i1', 1]);
  await openIn('video', song(30), { followOffsets: { tv1: 200 } });
  await store().startFollow(tv());
  expect(store().mode).toBe('lights');
  expect(updateSettings).not.toHaveBeenCalledWith({ playerMode: 'lights' });
  expect(followStart).toHaveBeenCalledWith('s1');
  await emit(report());
  expect(lastEffects()).toEqual(effectsOf('p1'));
  expect(argsOf('sync_play')).toEqual([{ time: expect.closeTo(99.8, 5) }]);
  expect(store()).toMatchObject({
    isPlaying: true,
    project: { id: 'p1' },
    follow: { status: 'live', title: 'Dynamite', itemId: 'i1' },
  });
});

it('waits for the first report from Rust instead of the picked session', async () => {
  shows(['p1', 'i1', 1]);
  await openIn('video');
  await store().startFollow(tv());
  expect(argsOf('sync_play')).toEqual([]);
  expect(store()).toMatchObject({
    isPlaying: false,
    project: { id: 'p1' },
    follow: { title: 'Dynamite', deviceName: 'Living room TV', itemId: null },
  });
});

it('moves a playing report on by the time it waited to apply', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  shows(['p1', 'i1', 1], ['p2', 'i2', 5]);
  let loaded: () => void = () => undefined;
  vi.mocked(loadProject).mockImplementationOnce(
    () =>
      new Promise<Project>((resolve) => {
        loaded = () => resolve(tvSong('p2', 'i2', 5));
      }),
  );
  emitFollow(report({ itemId: 'i2', positionS: 40 }));
  await flush();
  advance(2);
  loaded();
  await flush();
  expect(argsOf('sync_play')).toEqual([{ time: expect.closeTo(42, 5) }]);
});

it('realigns the lights only when the TV is off by more than 0.1 s', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  advance(3);
  await emit(report({ positionS: 103.05 }));
  expect(argsOf('sync_seek')).toEqual([]);
  await emit(report({ positionS: 103.3 }));
  expect(argsOf('sync_seek')).toEqual([{ time: expect.closeTo(103.3, 5) }]);
});

it('pauses and plays with the TV at the reported position', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  await emit(report({ positionS: 120, paused: true }));
  expect(invoke).toHaveBeenCalledWith('sync_pause');
  expect(argsOf('sync_seek')).toEqual([{ time: 120 }]);
  expect(store().isPlaying).toBe(false);
  await emit(report({ positionS: 120 }));
  expect(argsOf('sync_play')).toEqual([{ time: expect.closeTo(120, 5) }]);
  expect(store().isPlaying).toBe(true);
});

it('pauses the TV from the Mac and ignores its stale playing report', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  store().togglePlay();
  expect(sessionCommand).toHaveBeenCalledWith('s1', 'Pause');
  expect(invoke).toHaveBeenCalledWith('sync_pause');
  advance(0.25);
  await emit(report({ positionS: 100.25 }));
  expect(argsOf('sync_play')).toEqual([]);
  expect(store().isPlaying).toBe(false);
  await emit(report({ positionS: 100.3, paused: true }));
  expect(argsOf('sync_seek')).toEqual([{ time: expect.closeTo(100.3, 5) }]);
  expect(store().currentTime).toBeCloseTo(100.3);
});

it('seeks the TV from the Mac and waits for it to land', async () => {
  shows(['p1', 'i1', 1]);
  await follow(tv({ positionS: 50 }));
  store().seekDelta(10);
  expect(sessionCommand).toHaveBeenCalledWith('s1', 'Seek', 60);
  vi.mocked(invoke).mockClear();
  advance(0.5);
  await emit(report({ positionS: 51 }));
  expect(argsOf('sync_seek')).toEqual([]);
  await emit(report({ positionS: 60.2 }));
  expect(argsOf('sync_seek')).toEqual([{ time: expect.closeTo(60.2, 5) }]);
});

it('switches the light show when the TV changes video', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  shows(['p1', 'i1', 1], ['p2', 'i2', 5], ['p3', 'i2', 9]);
  await emit(report({ itemId: 'i3', title: 'Butter' }));
  expect(lastEffects()).toEqual({ effects: [] });
  expect(store()).toMatchObject({ project: null, duration: 0 });
  expect(store().follow).toMatchObject({ itemId: 'i3', candidates: [] });

  await emit(report({ itemId: 'i2' }));
  expect(store().project?.id).toBe('p3');
  expect(lastEffects()).toEqual(effectsOf('p3'));
  expect(store().follow?.candidates.map((c) => c.id)).toEqual(['p3', 'p2']);
  expect(store().follow?.chosen).toBe(false);

  await store().chooseFollowProject('p2');
  expect(updateSettings).toHaveBeenCalledWith({ followChoices: { i2: 'p2' } });
  expect(store().follow?.chosen).toBe(true);
  expect(lastEffects()).toEqual(effectsOf('p2'));
  expect(store().isPlaying).toBe(true);
});

it('keeps following a video with no light show', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  await emit(report({ itemId: 'i3', positionS: 40 }));
  expect(store()).toMatchObject({
    isPlaying: true,
    follow: { status: 'live' },
  });
  store().togglePlay();
  expect(sessionCommand).toHaveBeenCalledWith('s1', 'Pause');
});

it('keeps the followed show on the lights when following stops', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  store().stopFollow();
  expect(store().project?.id).toBe('p1');
  expect(lastEffects()).toEqual(effectsOf('p1'));
});

it('drops to no light show when the matching project fails to load', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.mocked(listProjects).mockResolvedValue([
    {
      id: 'gone',
      kind: 'song',
      name: 'gone',
      updatedAt: 3,
      jellyfinItemId: 'i2',
    },
  ]);
  await emit(report({ itemId: 'i2' }));
  expect(lastEffects()).toEqual({ effects: [] });
  expect(store()).toMatchObject({
    project: null,
    duration: 0,
    isPlaying: true,
  });
});

it('brings back the opened project after following a video with no show', async () => {
  shows(['p1', 'i1', 1]);
  await openIn('video', tvSong('p0', 'i0', 0));
  await store().startFollow(tv({ itemId: 'i3' }));
  await emit(report({ itemId: 'i3' }));
  expect(store().project).toBeNull();
  store().stopFollow();
  expect(store()).toMatchObject({ project: { id: 'p0' }, duration: 300 });
  expect(lastEffects()).toEqual(effectsOf('p0'));
});

it('keeps the chosen show over a slower load of the newest one', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  shows(['p1', 'i1', 1], ['p2', 'i2', 5], ['p3', 'i2', 9]);
  let resolveNewest: () => void = () => undefined;
  vi.mocked(loadProject).mockImplementationOnce(
    () =>
      new Promise<Project>((resolve) => {
        resolveNewest = () => resolve(tvSong('p3', 'i2', 9));
      }),
  );
  emitFollow(report({ itemId: 'i2' }));
  await flush();
  await store().chooseFollowProject('p2');
  resolveNewest();
  await flush();
  expect(store().project?.id).toBe('p2');
  expect(lastEffects()).toEqual(effectsOf('p2'));
});

it('flags a different video version only when the TV names one', async () => {
  shows(['p1', 'i1', 1]);
  await follow(tv({ mediaSourceId: 'ms2' }));
  expect(store().follow?.versionMismatch).toBe(true);
  await emit(report({ mediaSourceId: null }));
  expect(store().follow?.versionMismatch).toBe(false);
});

it('seeks the TV when the scrubber moves', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  store().seek(42);
  expect(sessionCommand).toHaveBeenCalledWith('s1', 'Seek', 42);
  vi.mocked(invoke).mockClear();
  advance(0.5);
  await emit(report({ positionS: 100.5 }));
  expect(argsOf('sync_seek')).toEqual([]);
});

it('stops the Rust follow only after its start went through', async () => {
  shows(['p1', 'i1', 1]);
  await openIn('video');
  let started: () => void = () => undefined;
  vi.mocked(followStart).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        started = resolve;
      }),
  );
  const following = store().startFollow(tv());
  await flush();
  store().stopFollow();
  await flush();
  expect(followStop).not.toHaveBeenCalled();
  started();
  await following;
  await flush();
  expect(followStop).toHaveBeenCalledWith('s1');
  expect(vi.mocked(followStop).mock.invocationCallOrder[0]).toBeGreaterThan(
    vi.mocked(followStart).mock.invocationCallOrder[0],
  );
});

it('keeps Lights only while following', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  await store().setMode('video');
  expect(store().mode).toBe('lights');
  expect(updateSettings).not.toHaveBeenCalled();
  expect(openSongSource).not.toHaveBeenCalled();
});

it('stops following before opening another project', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  await store().open(song(30));
  expect(followStop).toHaveBeenCalledWith('s1');
  expect(unlisten).toHaveBeenCalled();
  expect(store().follow).toBeNull();
});

it('loads the project chosen before for a video', async () => {
  shows(['p0', 'i1', 1], ['p1', 'i1', 5]);
  await follow(tv(), { followChoices: { i1: 'p0' } });
  expect(store().project?.id).toBe('p0');
  expect(store().follow?.chosen).toBe(true);
});

it('keeps the show of the latest video when loads finish out of order', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  shows(['p1', 'i1', 1], ['pa', 'ia', 1], ['pb', 'ib', 2]);
  const pa = tvSong('pa', 'ia', 1);
  let resolveA: () => void = () => undefined;
  vi.mocked(loadProject).mockImplementationOnce(
    () =>
      new Promise<Project>((resolve) => {
        resolveA = () => resolve(pa);
      }),
  );
  emitFollow(report({ itemId: 'ia' }));
  emitFollow(report({ itemId: 'ib' }));
  await flush();
  resolveA();
  await flush();
  expect(lastEffects()).toEqual(effectsOf('pb'));
  expect(store().project?.id).toBe('pb');
});

it('pauses the lights while the TV is lost and resumes on its next report', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  await emit({ kind: 'lost', sessionId: 's1' });
  expect(invoke).toHaveBeenCalledWith('sync_pause');
  expect(store().follow?.status).toBe('lost');
  advance(5);
  await emit(report({ positionS: 106 }));
  expect(argsOf('sync_play')).toEqual([{ time: expect.closeTo(106, 5) }]);
  expect(store().follow?.status).toBe('live');
});

it('only commands the TV while it is not live', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  await emit({ kind: 'lost', sessionId: 's1' });
  vi.clearAllMocks();
  store().togglePlay();
  store().seekDelta(10);
  expect(sessionCommand).toHaveBeenCalledWith('s1', 'Unpause');
  expect(sessionCommand).toHaveBeenCalledWith('s1', 'Seek', 110);
  expect(invoke).not.toHaveBeenCalled();
  expect(store()).toMatchObject({ isPlaying: false, currentTime: 100 });
  await emit(report({ positionS: 100.2 }));
  expect(argsOf('sync_play')).toEqual([{ time: expect.closeTo(100.2, 5) }]);
});

it('ignores events from another session', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  await emit(report({ sessionId: 's2', positionS: 150, paused: true }));
  await emit({ kind: 'lost', sessionId: 's2' });
  expect(invoke).not.toHaveBeenCalled();
  expect(store().follow?.status).toBe('live');
});

it('keeps an offset per TV and restores the old one when following stops', async () => {
  shows(['p1', 'i1', 1]);
  await openIn('video', song(30), { followOffsets: { tv1: 340 } });
  store().setOffset(120);
  await store().startFollow(tv());
  expect(store().offsetMs).toBe(340);
  store().nudgeOffset(10);
  await flush();
  expect(updateSettings).toHaveBeenCalledWith({ followOffsets: { tv1: 350 } });
  store().stopFollow();
  await flush();
  expect(followStop).toHaveBeenCalledWith('s1');
  expect(unlisten).toHaveBeenCalled();
  expect(store()).toMatchObject({ offsetMs: 120, mode: 'video', follow: null });
});

it('stops following on leave without loading the video', async () => {
  shows(['p1', 'i1', 1]);
  await follow();
  store().leave();
  await flush();
  expect(followStop).toHaveBeenCalledWith('s1');
  expect(openSongSource).not.toHaveBeenCalled();
  expect(store().follow).toBeNull();
});

it('drops the listener when following stops before it is ready', async () => {
  shows(['p1', 'i1', 1]);
  await openIn('video');
  let ready: () => void = () => undefined;
  vi.mocked(listen).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        ready = () => resolve(unlisten);
      }),
  );
  const started = store().startFollow(tv());
  store().stopFollow();
  await flush();
  ready();
  await started;
  expect(unlisten).toHaveBeenCalled();
  expect(followStart).not.toHaveBeenCalled();
});

it('keeps playing past the end of the project while following', async () => {
  shows(['p1', 'i1', 1]);
  await follow(tv({ positionS: 295 }));
  advance(10);
  store().tickLights();
  expect(store().isPlaying).toBe(true);
  expect(invoke).not.toHaveBeenCalledWith('sync_pause');
});

it('asks an idle TV to play the opened show and follows it', async () => {
  shows(['p2', 'i1', 5], ['p1', 'i1', 1]);
  await openIn('lights', tvSong('p1', 'i1', 1));
  store().seek(42);
  const timers = vi.spyOn(globalThis, 'setTimeout');
  await store().startFollow(idleTv());
  expect(followStart).toHaveBeenCalledWith('s1');
  expect(playOnSession).toHaveBeenCalledWith('s1', 'i1', 'ms1', 42);
  expect(store()).toMatchObject({
    isPlaying: false,
    follow: { status: 'starting', title: 'p1' },
  });
  await emit({ kind: 'idle', sessionId: 's1' });
  expect(store().follow?.status).toBe('starting');
  await emit(report({ positionS: 42 }));
  expect(store()).toMatchObject({
    isPlaying: true,
    project: { id: 'p1' },
    follow: { status: 'live', chosen: true },
  });
  const giveUp = timers.mock.calls.find(([, ms]) => ms === 10_000)?.[0];
  (giveUp as () => void)();
  expect(store().follow?.status).toBe('live');
});

it('stops waiting for an idle TV that never starts', async () => {
  await openIn('lights', tvSong('p1', 'i1', 1));
  const timers = vi.spyOn(globalThis, 'setTimeout');
  await store().startFollow(idleTv());
  await emit({ kind: 'idle', sessionId: 's1' });
  const giveUp = timers.mock.calls.find(([, ms]) => ms === 10_000)?.[0];
  (giveUp as () => void)();
  expect(store().follow?.status).toBe('idle');
});

it('refuses to play on an idle TV without a Jellyfin video', async () => {
  await openIn('lights', song(30));
  await expect(store().startFollow(idleTv())).rejects.toThrow(
    'Open a project with a Jellyfin video',
  );
  expect(followStart).not.toHaveBeenCalled();
  expect(store().follow).toBeNull();
});
