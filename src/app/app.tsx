import { useEffect } from 'react';

import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';

import './globals.css';
import DownloadModal from '../components/download-modal';
import EditorPage from '../pages/editor/editor-page';
import HomePage from '../pages/home/home-page';
import { useAppStore } from '../stores/app-store';
import { useEditorStore } from '../stores/editor-store';

function useMenuListener() {
  useEffect(() => {
    const unlisten = listen<string>('menu-action', (event) => {
      const { route, closeProject, openProject, setShowNewProjectModal } =
        useAppStore.getState();

      switch (event.payload) {
        case 'new_project':
          if (route === 'editor') closeProject();
          setShowNewProjectModal(true);
          break;

        case 'open_project':
          void (async () => {
            const selected = await open({ directory: true, multiple: false });
            if (selected) await openProject(selected);
          })();
          break;

        case 'save':
          if (route === 'editor') void useEditorStore.getState().saveEffects();
          break;

        case 'close_project':
          if (route === 'editor') closeProject();
          break;
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);
}

export default function App() {
  const route = useAppStore((s) => s.route);
  const downloading = useAppStore((s) => s.downloading);

  useMenuListener();

  return (
    <>
      {route === 'editor' ? <EditorPage /> : <HomePage />}
      <DownloadModal open={downloading} />
    </>
  );
}
