import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';
import { exists } from '@tauri-apps/plugin-fs';

export interface ProjectManifest {
  name: string;
  sourceType: string;
  videoPath: string | null;
  youtubeUrl: string | null;
  effectsFile: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecentProject {
  name: string;
  dir: string;
  updatedAt: number;
}

export interface ActiveProject {
  dir: string;
  manifest: ProjectManifest;
}

type Route = 'home' | 'editor';

interface AppState {
  route: Route;
  activeProject: ActiveProject | null;
  recentProjects: RecentProject[];
  showNewProjectModal: boolean;
  pendingDir: string | null;
  downloading: boolean;

  loadRecentProjects: () => Promise<void>;
  openProject: (dir: string) => Promise<void>;
  createProject: (params: {
    dir: string;
    name: string;
    sourceType: string;
    videoPath: string | null;
    youtubeUrl: string | null;
  }) => Promise<void>;
  closeProject: () => void;
  setShowNewProjectModal: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  route: 'home',
  activeProject: null,
  recentProjects: [],
  showNewProjectModal: false,
  pendingDir: null,
  downloading: false,

  loadRecentProjects: async () => {
    try {
      const projects = await invoke<RecentProject[]>('load_recent_projects');
      set({ recentProjects: projects });
    } catch (e) {
      console.error('Failed to load recent projects:', e);
    }
  },

  openProject: async (dir: string) => {
    const manifest = await invoke<ProjectManifest | null>('load_project', {
      dir,
    });

    if (!manifest) {
      set({ pendingDir: dir, showNewProjectModal: true });
      return;
    }

    if (manifest.videoPath) {
      const videoExists = await exists(`${dir}/${manifest.videoPath}`);

      if (
        !videoExists &&
        manifest.sourceType === 'youtube' &&
        manifest.youtubeUrl
      ) {
        set({ downloading: true });
        try {
          await invoke<string>('download_youtube', {
            url: manifest.youtubeUrl,
            destDir: dir,
          });
        } finally {
          set({ downloading: false });
        }
      }
    }

    await invoke<RecentProject[]>('add_recent_project', {
      name: manifest.name,
      dir,
    });

    set({
      route: 'editor',
      activeProject: { dir, manifest },
    });
  },

  createProject: async (params) => {
    const manifest = await invoke<ProjectManifest>('create_project', {
      dir: params.dir,
      name: params.name,
      sourceType: params.sourceType,
      videoPath: params.videoPath,
      youtubeUrl: params.youtubeUrl,
    });

    await invoke<RecentProject[]>('add_recent_project', {
      name: manifest.name,
      dir: params.dir,
    });

    set({
      route: 'editor',
      activeProject: { dir: params.dir, manifest },
    });
  },

  closeProject: () => {
    set({
      route: 'home',
      activeProject: null,
    });
  },

  setShowNewProjectModal: (open) => {
    set({ showNewProjectModal: open, pendingDir: open ? undefined : null });
  },
}));
