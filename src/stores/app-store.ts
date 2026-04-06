import { create } from 'zustand';

import { invoke } from '@tauri-apps/api/core';

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
}

export const useAppStore = create<AppState>((set) => ({
  route: 'home',
  activeProject: null,
  recentProjects: [],

  loadRecentProjects: async () => {
    try {
      const projects = await invoke<RecentProject[]>('load_recent_projects');
      set({ recentProjects: projects });
    } catch (e) {
      console.error('Failed to load recent projects:', e);
    }
  },

  openProject: async (dir: string) => {
    const manifest = await invoke<ProjectManifest>('load_project', { dir });

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
}));
