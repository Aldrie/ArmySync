import type { ProjectSummary } from '../project';

export interface Playlist {
  id: string;
  name: string;
  projectIds: string[];
  createdAt: number;
}

const update = (
  list: Playlist[],
  id: string,
  fn: (playlist: Playlist) => Playlist,
): Playlist[] => list.map((p) => (p.id === id ? fn(p) : p));

export const createPlaylist = (
  list: Playlist[],
  input: { id: string; name: string; now: number },
): Playlist[] => [
  ...list,
  { id: input.id, name: input.name, projectIds: [], createdAt: input.now },
];

export const renamePlaylist = (
  list: Playlist[],
  id: string,
  name: string,
): Playlist[] => update(list, id, (p) => ({ ...p, name }));

export const deletePlaylist = (list: Playlist[], id: string): Playlist[] =>
  list.filter((p) => p.id !== id);

export const addToPlaylist = (
  list: Playlist[],
  id: string,
  projectId: string,
): Playlist[] =>
  update(list, id, (p) =>
    p.projectIds.includes(projectId)
      ? p
      : { ...p, projectIds: [...p.projectIds, projectId] },
  );

export const removeFromPlaylist = (
  list: Playlist[],
  id: string,
  projectId: string,
): Playlist[] =>
  update(list, id, (p) => ({
    ...p,
    projectIds: p.projectIds.filter((pid) => pid !== projectId),
  }));

export const resolvePlaylist = (
  playlist: Playlist,
  projects: ProjectSummary[],
): ProjectSummary[] => {
  const byId = new Map(projects.map((p) => [p.id, p]));
  return playlist.projectIds.flatMap((id) => byId.get(id) ?? []);
};
