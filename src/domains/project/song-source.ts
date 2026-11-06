import { projectFileUrl } from './library';
import { getSongMedia, isJellyfinMedia } from './model';
import type { Project } from './types';
import { closeJellyfinStream, openJellyfinStream } from '../jellyfin/api';

interface SongSource {
  videoSrc: string;
  mediaError: string | null;
}

let openGeneration = 0;
let releasedGeneration = -1;

async function resolveSource(
  project: Project,
  generation: number,
): Promise<SongSource> {
  const song = getSongMedia(project);
  if (!song) return { videoSrc: '', mediaError: null };
  try {
    if (!isJellyfinMedia(song.media))
      return {
        videoSrc: await projectFileUrl(project.id, song.media.file),
        mediaError: null,
      };
    const { itemId, mediaSourceId } = song.media.source;
    const videoSrc = await openJellyfinStream(itemId, mediaSourceId);
    // A newer open already replaced this session on the server; only a release leaves it orphaned.
    if (generation !== openGeneration && openGeneration === releasedGeneration)
      void closeJellyfinStream();
    return { videoSrc, mediaError: null };
  } catch (err) {
    return { videoSrc: '', mediaError: String(err) };
  }
}

export async function openSongSource(
  project: Project,
): Promise<SongSource | null> {
  const generation = ++openGeneration;
  const source = await resolveSource(project, generation);
  return generation === openGeneration ? source : null;
}

export function releaseSongSource(): void {
  releasedGeneration = ++openGeneration;
  void closeJellyfinStream();
}
