import type { EffectInstance } from '../effects';

export type MediaType = 'video' | 'audio';

export type MediaSource =
  | { type: 'file'; originalName: string }
  | { type: 'youtube'; url: string };

export interface JellyfinSource {
  type: 'jellyfin';
  itemId: string;
  mediaSourceId: string;
  serverId: string;
}

export interface LocalMediaEntry {
  file: string;
  type: MediaType;
  duration: number;
  source: MediaSource;
}

export interface JellyfinMediaEntry {
  type: MediaType;
  duration: number;
  source: JellyfinSource;
}

export type MediaEntry = LocalMediaEntry | JellyfinMediaEntry;

export type ClipMode = 'media+lights' | 'lights' | 'media';

export type ClipRef =
  | { type: 'media'; mediaId: string }
  | { type: 'project'; projectId: string };

export interface Clip {
  id: string;
  start: number;
  in: number;
  out: number;
  mode: ClipMode;
  ref: ClipRef;
}

export type Track =
  | { id: string; kind: 'clips'; clips: Clip[] }
  | { id: string; kind: 'lights'; effects: EffectInstance[] };

export type ProjectKind = 'song' | 'show';

export interface Project {
  formatVersion: 1;
  id: string;
  kind: ProjectKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  media: Record<string, MediaEntry>;
  tracks: Track[];
}

export interface ProjectSummary {
  id: string;
  kind: ProjectKind;
  name: string;
  updatedAt: number;
  jellyfinItemId: string | null;
}
