import { createId } from '@paralleldrive/cuid2';

import type { EffectInstance } from '../effects';
import type { Clip, MediaEntry, MediaType, Project, Track } from './types';

export const VIDEO_EXTENSIONS: string[] = ['mp4', 'mov', 'm4v'];
export const AUDIO_EXTENSIONS: string[] = ['m4a', 'mp3', 'aac', 'wav'];

export const mediaTypeFromPath = (path: string): MediaType | null => {
  const name = path.split(/[\\/]/).pop() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = name.slice(dot + 1).toLowerCase();
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  return null;
};

export const createSongProject = (input: {
  id: string;
  name: string;
  mediaId: string;
  media: MediaEntry;
  now: number;
}): Project => ({
  formatVersion: 1,
  id: input.id,
  kind: 'song',
  name: input.name,
  createdAt: input.now,
  updatedAt: input.now,
  media: { [input.mediaId]: input.media },
  tracks: [
    {
      id: createId(),
      kind: 'clips',
      clips: [
        {
          id: createId(),
          start: 0,
          in: 0,
          out: input.media.duration,
          mode: 'media+lights',
          ref: { type: 'media', mediaId: input.mediaId },
        },
      ],
    },
    { id: createId(), kind: 'lights', effects: [] },
  ],
});

const isSongClip = (clip: Clip) => clip.ref.type === 'media';

const findSongClip = (project: Project): Clip | undefined => {
  for (const track of project.tracks) {
    if (track.kind !== 'clips') continue;
    const clip = track.clips.find(isSongClip);
    if (clip) return clip;
  }
};

export const getSongMedia = (
  project: Project,
): { mediaId: string; media: MediaEntry } | null => {
  const clip = findSongClip(project);
  if (clip?.ref.type !== 'media') return null;
  const media = project.media[clip.ref.mediaId];
  return media ? { mediaId: clip.ref.mediaId, media } : null;
};

export const getSongEffects = (project: Project): EffectInstance[] => {
  const track = project.tracks.find((t) => t.kind === 'lights');
  return track?.kind === 'lights' ? track.effects : [];
};

export const withSongEffects = (
  project: Project,
  effects: EffectInstance[],
): Project => {
  const index = project.tracks.findIndex((t) => t.kind === 'lights');
  return {
    ...project,
    tracks: project.tracks.map((track, i) =>
      i === index && track.kind === 'lights' ? { ...track, effects } : track,
    ),
  };
};

export const withSongMediaDuration = (
  project: Project,
  duration: number,
): Project => {
  const song = getSongMedia(project);
  const clip = findSongClip(project);
  if (!song || !clip) return project;
  const tracks: Track[] = project.tracks.map((track) =>
    track.kind === 'clips'
      ? {
          ...track,
          clips: track.clips.map((c) =>
            c === clip ? { ...c, out: duration } : c,
          ),
        }
      : track,
  );
  return {
    ...project,
    media: {
      ...project.media,
      [song.mediaId]: { ...song.media, duration },
    },
    tracks,
  };
};

export const parseProject = (raw: unknown): Project => {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('formatVersion' in raw) ||
    raw.formatVersion !== 1 ||
    !('kind' in raw) ||
    (raw.kind !== 'song' && raw.kind !== 'show') ||
    !('id' in raw) ||
    !('name' in raw) ||
    !('tracks' in raw) ||
    !('media' in raw)
  ) {
    throw new Error('Unsupported project format');
  }
  return raw as Project;
};
