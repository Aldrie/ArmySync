import { Music, Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import NewSongModal from './components/new-song-modal';
import ProjectRow from './components/project-row';
import AppIcon from '../../assets/icon.svg?react';
import Button from '../../components/button';
import Modal from '../../components/modal';
import type { ProjectSummary } from '../../domains/project';
import { modKey } from '../../lib/keys';
import { useAppStore } from '../../stores/app-store';

export default function LibraryPage() {
  const projects = useAppStore((s) => s.projects);
  const refreshProjects = useAppStore((s) => s.refreshProjects);
  const openProject = useAppStore((s) => s.openProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const modalOpen = useAppStore((s) => s.showNewSongModal);
  const setModalOpen = useAppStore((s) => s.setShowNewSongModal);

  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTitleId = useId();

  const songs = projects.filter((p) => p.kind === 'song');

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const handleOpen = (id: string) => {
    openProject(id).catch((e: unknown) =>
      console.error('Failed to open song:', e),
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteProject(pendingDelete.id).catch((e: unknown) =>
      console.error('Failed to delete song:', e),
    );
    setDeleteOpen(false);
  };

  return (
    <div className="relative flex h-screen flex-col items-center overflow-y-auto bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent)]"
      />

      <div className="relative flex w-full max-w-xl flex-1 flex-col px-6 pt-24 pb-12">
        <header className="mb-10 flex flex-col items-center text-center">
          <AppIcon className="mb-4 size-14 drop-shadow-[0_0_24px_color-mix(in_srgb,var(--color-primary)_45%,transparent)]" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">
            ArmySync
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Lightstick animation editor for BTS Army Bombs
          </p>
        </header>

        <div className="mb-12 flex items-center justify-center">
          <Button intent="primary" size="lg" onClick={() => setModalOpen(true)}>
            <Plus />
            New Song
            <Kbd>{modKey}N</Kbd>
          </Button>
        </div>

        <section className="flex-1">
          {songs.length > 0 ? (
            <>
              <h2 className="mb-2.5 px-1 text-xs font-semibold text-on-surface-variant">
                Songs
              </h2>
              <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-low shadow-raised">
                {songs.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onOpen={() => handleOpen(project.id)}
                    onDelete={() => {
                      setPendingDelete(project);
                      setDeleteOpen(true);
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-14 text-center">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-surface-high text-on-surface-variant">
                <Music className="size-5" />
              </div>
              <p className="text-sm font-medium text-on-surface">
                No songs yet
              </p>
              <p className="mt-1 max-w-xs text-xs text-balance text-on-surface-variant">
                Create a song from a video, an audio file or a YouTube link
              </p>
            </div>
          )}
        </section>
      </div>

      <NewSongModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        labelledBy={deleteTitleId}
        className="flex w-sm flex-col"
      >
        <div className="px-6 pt-6 pb-5">
          <h2
            id={deleteTitleId}
            className="font-display text-lg font-bold tracking-tight text-on-surface"
          >
            Delete “{pendingDelete?.name}”?
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            This removes its media and lights.
          </p>
        </div>
        <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-surface-low/60 px-6 py-4">
          <Button intent="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button intent="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 font-sans text-xs font-medium tracking-wide opacity-55">
      {children}
    </kbd>
  );
}
