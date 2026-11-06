import { beforeEach, expect, it, vi } from 'vitest';

import { projectFileUrl } from './library';
import { createSongProject } from './model';
import { openSongSource, releaseSongSource } from './song-source';
import { closeJellyfinStream, openJellyfinStream } from '../jellyfin/api';

vi.mock('../jellyfin/api', () => ({
  openJellyfinStream: vi.fn(),
  closeJellyfinStream: vi.fn(() => Promise.resolve()),
}));

vi.mock('./library', () => ({
  projectFileUrl: vi.fn(() => Promise.resolve('file-url')),
}));

const jellyfinSong = () =>
  createSongProject({
    id: 'p1',
    name: 'Show',
    mediaId: 'm1',
    now: 0,
    media: {
      type: 'video',
      duration: 60,
      source: {
        type: 'jellyfin',
        itemId: 'it',
        mediaSourceId: 'ms',
        serverId: 'srv',
      },
    },
  });

const pendingOpens = () => {
  const opens: Array<(url: string) => void> = [];
  vi.mocked(openJellyfinStream).mockImplementation(
    () => new Promise((resolve) => opens.push(resolve)),
  );
  return opens;
};

beforeEach(() => {
  vi.mocked(closeJellyfinStream).mockClear();
});

it('drops an open that a newer open replaced, keeping its stream', async () => {
  const opens = pendingOpens();
  const first = openSongSource(jellyfinSong());
  const second = openSongSource(jellyfinSong());
  opens[1]('second');
  expect(await second).toEqual({ videoSrc: 'second', mediaError: null });
  opens[0]('first');
  expect(await first).toBeNull();
  expect(closeJellyfinStream).not.toHaveBeenCalled();
});

it('closes the stream an open finished after a release', async () => {
  const opens = pendingOpens();
  const opening = openSongSource(jellyfinSong());
  releaseSongSource();
  opens[0]('late');
  expect(await opening).toBeNull();
  expect(closeJellyfinStream).toHaveBeenCalledTimes(2);
});

it('reports a local file that cannot be resolved as a media error', async () => {
  vi.mocked(projectFileUrl).mockRejectedValueOnce(new Error('no app dir'));
  const project = createSongProject({
    id: 'p1',
    name: 'Song',
    mediaId: 'm1',
    now: 0,
    media: {
      file: 'media/m1.mp4',
      type: 'video',
      duration: 60,
      source: { type: 'file', originalName: 'song.mp4' },
    },
  });
  expect(await openSongSource(project)).toEqual({
    videoSrc: '',
    mediaError: 'Error: no app dir',
  });
});
