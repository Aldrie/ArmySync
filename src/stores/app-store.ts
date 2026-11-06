import { create } from 'zustand';

import { useEditorStore } from './editor-store';
import { usePlayerStore } from './player-store';
import * as library from '../domains/project';
import type {
  NewSongSource,
  Project,
  ProjectSummary,
} from '../domains/project';

type Route = 'library' | 'editor' | 'player';

interface AppState {
  route: Route;
  projects: ProjectSummary[];
  activeProject: Project | null;
  showNewSongModal: boolean;
  downloading: boolean;

  refreshProjects: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  openPlayer: (id: string) => Promise<void>;
  closePlayer: () => void;
  createSong: (input: { name: string; source: NewSongSource }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;
  setShowNewSongModal: (open: boolean) => void;
}

let closing: Promise<void> = Promise.resolve();
let openRequest = 0;

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
    const fromPlayer = get().route === 'player';
    if (fromPlayer) usePlayerStore.getState().leave();
    const request = ++openRequest;
    try {
      await closing;
      const project = await library.loadProject(id);
      if (request !== openRequest) return;
      set({ route: 'editor', activeProject: project });
    } catch (e) {
      if (fromPlayer && request === openRequest)
        set({ route: 'library', activeProject: null });
      throw e;
    }
  },

  openPlayer: async (id) => {
    const request = ++openRequest;
    await closing;
    const project = await library.loadProject(id);
    if (request !== openRequest) return;
    set({ route: 'player', activeProject: project });
    await usePlayerStore.getState().open(project);
  },

  closePlayer: () => {
    openRequest++;
    usePlayerStore.getState().leave();
    set({ route: 'library', activeProject: null });
    void get().refreshProjects();
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
    closing = editor.isDirty ? editor.saveEffects() : Promise.resolve();
    editor.resetEditor();
    set({ route: 'library', activeProject: null });
    void closing.then(() => get().refreshProjects());
  },

  setShowNewSongModal: (open) => {
    set({ showNewSongModal: open });
  },
}));
