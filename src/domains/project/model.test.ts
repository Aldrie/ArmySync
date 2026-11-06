import { describe, expect, it } from 'vitest';

import type { EffectInstance } from '../effects';
import {
  createSongProject,
  getSongEffects,
  getSongMedia,
  isJellyfinMedia,
  mediaTypeFromPath,
  parseProject,
  withSongEffects,
  withSongMediaDuration,
} from './model';
import type { MediaEntry } from './types';

const media = (duration: number): MediaEntry => ({
  file: 'm1.mp4',
  type: 'video',
  duration,
  source: { type: 'file', originalName: 'song.mp4' },
});

const song = (duration = 120) =>
  createSongProject({
    id: 'p1',
    name: 'Song',
    mediaId: 'm1',
    media: media(duration),
    now: 1000,
  });

const flash: EffectInstance = {
  id: 'e1',
  type: 'flash',
  from: 0,
  to: 1,
  params: { colors: ['#fff', '#000'], bpm: 180 },
};

describe('isJellyfinMedia', () => {
  it('tells Jellyfin media apart', () => {
    expect(
      isJellyfinMedia({
        type: 'video',
        duration: 1,
        source: {
          type: 'jellyfin',
          itemId: 'i',
          mediaSourceId: 'm',
          serverId: 's',
        },
      }),
    ).toBe(true);
    expect(
      isJellyfinMedia({
        file: 'media/a.mp4',
        type: 'video',
        duration: 1,
        source: { type: 'file', originalName: 'a.mp4' },
      }),
    ).toBe(false);
  });
});

describe('mediaTypeFromPath', () => {
  it('detects media type from the extension, case-insensitively', () => {
    expect(mediaTypeFromPath('/a/B.MP4')).toBe('video');
    expect(mediaTypeFromPath('/a/x.m4a')).toBe('audio');
    expect(mediaTypeFromPath('/a/x.mkv')).toBeNull();
    expect(mediaTypeFromPath('/a/noext')).toBeNull();
  });
});

describe('createSongProject', () => {
  it('builds a song with a clips track and an empty lights track', () => {
    const p = song();
    expect(p.kind).toBe('song');
    expect(p.formatVersion).toBe(1);
    expect(p.createdAt).toBe(1000);
    expect(p.updatedAt).toBe(1000);
    const [clips, lights] = p.tracks;
    expect(clips.kind).toBe('clips');
    if (clips.kind !== 'clips') return;
    expect(clips.clips[0]).toMatchObject({
      start: 0,
      in: 0,
      out: 120,
      mode: 'media+lights',
      ref: { type: 'media', mediaId: 'm1' },
    });
    expect(lights).toMatchObject({ kind: 'lights', effects: [] });
  });
});

describe('getSongMedia', () => {
  it('returns the song media entry', () => {
    expect(getSongMedia(song())).toEqual({ mediaId: 'm1', media: media(120) });
  });
});

describe('withSongEffects', () => {
  it('keeps effect params through a JSON round trip without mutating input', () => {
    const p = song();
    const saved = parseProject(
      JSON.parse(JSON.stringify(withSongEffects(p, [flash]))),
    );
    expect(getSongEffects(saved)[0].params).toEqual({
      colors: ['#fff', '#000'],
      bpm: 180,
    });
    expect(getSongEffects(p)).toEqual([]);
  });
});

describe('withSongMediaDuration', () => {
  it('sets media duration and clip out', () => {
    const p = withSongMediaDuration(song(0), 95.5);
    expect(p.media.m1.duration).toBe(95.5);
    const [clips] = p.tracks;
    expect(clips.kind === 'clips' && clips.clips[0].out).toBe(95.5);
  });
});

describe('parseProject', () => {
  it('accepts a valid project and rejects unsupported ones', () => {
    const valid = song();
    expect(parseProject(valid)).toEqual(valid);
    expect(() => parseProject({ ...valid, formatVersion: 2 })).toThrow(
      'Unsupported project format',
    );
    expect(() => parseProject(null)).toThrow('Unsupported project format');
    expect(() => parseProject({ ...valid, kind: 'x' })).toThrow(
      'Unsupported project format',
    );
  });
});
