import { createId } from '@paralleldrive/cuid2';

import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';

import { createSongProject, mediaTypeFromPath, parseProject } from './model';
import type { MediaEntry, Project, ProjectSummary } from './types';

export type NewSongSource =
  | { type: 'file'; path: string }
  | { type: 'youtube'; url: string };

export const listProjects = async (): Promise<ProjectSummary[]> => {
  const projects = await invoke<ProjectSummary[]>('list_projects');
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
};

export const loadProject = async (id: string): Promise<Project> =>
  parseProject(await invoke<unknown>('read_project', { id }));

let saveQueue: Promise<unknown> = Promise.resolve();

export const saveProject = (project: Project): Promise<Project> => {
  const run = saveQueue.then(async () => {
    const stamped = { ...project, updatedAt: Date.now() };
    await invoke('write_project', { id: stamped.id, project: stamped });
    return stamped;
  });
  saveQueue = run.catch(() => undefined);
  return run;
};

export const deleteProject = async (id: string): Promise<void> => {
  await invoke('delete_project', { id });
};

export const projectFilePath = async (
  projectId: string,
  file: string,
): Promise<string> => join(await appDataDir(), 'projects', projectId, file);

export const projectFileUrl = async (
  projectId: string,
  file: string,
): Promise<string> => convertFileSrc(await projectFilePath(projectId, file));

const importSongMedia = async (
  projectId: string,
  mediaId: string,
  source: NewSongSource,
): Promise<MediaEntry> => {
  if (source.type === 'youtube') {
    const file = await invoke<string>('download_youtube_media', {
      url: source.url,
      projectId,
      mediaId,
    });
    return {
      file,
      type: 'video',
      duration: 0,
      source: { type: 'youtube', url: source.url },
    };
  }
  const file = await invoke<string>('import_media', {
    projectId,
    srcPath: source.path,
    mediaId,
  });
  const type = mediaTypeFromPath(file);
  if (!type) throw new Error('Unsupported media file');
  return {
    file,
    type,
    duration: 0,
    source: {
      type: 'file',
      originalName: source.path.split(/[\\/]/).pop() ?? source.path,
    },
  };
};

export const createSong = async (input: {
  name: string;
  source: NewSongSource;
}): Promise<Project> => {
  const id = createId();
  const mediaId = createId();
  try {
    const media = await importSongMedia(id, mediaId, input.source);
    return await saveProject(
      createSongProject({
        id,
        name: input.name,
        mediaId,
        media,
        now: Date.now(),
      }),
    );
  } catch (error) {
    await deleteProject(id).catch(() => undefined);
    throw error;
  }
};
