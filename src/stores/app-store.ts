import { create } from 'zustand';

import { useEditorStore } from './editor-store';
import * as library from '../domains/project';
import type {
  NewSongSource,
  Project,
  ProjectSummary,
} from '../domains/project';

type Route = 'library' | 'editor';

interface AppState {
  route: Route;
  projects: ProjectSummary[];
  activeProject: Project | null;
  showNewSongModal: boolean;
  downloading: boolean;

  refreshProjects: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  createSong: (input: { name: string; source: NewSongSource }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;
  setShowNewSongModal: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  route: 'library',
  projects: [],
  activeProject: null,
  showNewSongModal: false,
  downloading: false,

  refreshProjects: async () => {
    try {
      set({ projects: await library.listProjects() });
    } catch (e) {
      console.error('Failed to list projects:', e);
    }
  },

  openProject: async (id) => {
    const project = await library.loadProject(id);
    set({ route: 'editor', activeProject: project });
  },

  createSong: async (input) => {
    set({ downloading: input.source.type === 'youtube' });
    try {
      const project = await library.createSong(input);
      set({ route: 'editor', activeProject: project });
    } finally {
      set({ downloading: false });
    }
  },

  deleteProject: async (id) => {
    await library.deleteProject(id);
    await get().refreshProjects();
  },

  closeProject: () => {
    const editor = useEditorStore.getState();
    const flushed = editor.isDirty ? editor.saveEffects() : Promise.resolve();
    set({ route: 'library', activeProject: null });
    void flushed.then(() => get().refreshProjects());
  },

  setShowNewSongModal: (open) => {
    set({ showNewSongModal: open });
  },
}));
