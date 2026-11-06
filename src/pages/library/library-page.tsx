import { ListMusic, Music, Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import AddToPlaylistModal from './components/add-to-playlist-modal';
import NewSongModal from './components/new-song-modal';
import PlaylistSidebar from './components/playlist-sidebar';
import ProjectRow from './components/project-row';
import AppIcon from '../../assets/icon.svg?react';
import Button from '../../components/button';
import Modal from '../../components/modal';
import { resolvePlaylist } from '../../domains/playlists';
import type { ProjectSummary } from '../../domains/project';
import { modKey } from '../../lib/keys';
import { useAppStore } from '../../stores/app-store';
import { usePlaylistStore } from '../../stores/playlist-store';

export default function LibraryPage() {
  const projects = useAppStore((s) => s.projects);
  const refreshProjects = useAppStore((s) => s.refreshProjects);
  const openProject = useAppStore((s) => s.openProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const modalOpen = useAppStore((s) => s.showNewSongModal);
  const setModalOpen = useAppStore((s) => s.setShowNewSongModal);
  const playlists = usePlaylistStore((s) => s.playlists);
  const selectedId = usePlaylistStore((s) => s.selectedId);
  const loadPlaylists = usePlaylistStore((s) => s.load);
  const removeSong = usePlaylistStore((s) => s.removeSong);

  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTitleId = useId();
  const [playlistTarget, setPlaylistTarget] = useState<ProjectSummary | null>(
    null,
  );
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  const songs = projects.filter((p) => p.kind === 'song');
  const selectedPlaylist = playlists.find((p) => p.id === selectedId);
  const visibleSongs = selectedPlaylist
    ? resolvePlaylist(selectedPlaylist, songs)
    : songs;

  useEffect(() => {
    void refreshProjects();
    void loadPlaylists();
  }, [refreshProjects, loadPlaylists]);

  const handleOpen = (id: string) => {
    openProject(id).catch((e: unknown) =>
      console.error('Failed to open project:', e),
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteProject(pendingDelete.id).catch((e: unknown) =>
      console.error('Failed to delete project:', e),
    );
    setDeleteOpen(false);
  };

  return (
    <div className="relative flex h-screen flex-col items-center overflow-y-auto bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent)]"
      />

      <div className="relative flex w-full max-w-4xl flex-1 flex-col px-6 pt-24 pb-12">
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
            New Project
            <Kbd>{modKey}N</Kbd>
          </Button>
        </div>

        <div className="grid flex-1 grid-cols-[220px_minmax(0,1fr)] items-start gap-8">
          <aside>
            <PlaylistSidebar />
          </aside>

          <section>
            {visibleSongs.length > 0 ? (
              <>
                <h2 className="mb-2.5 truncate px-1 text-xs font-semibold text-on-surface-variant">
                  {selectedPlaylist?.name ?? 'Projects'}
                </h2>
                <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-low shadow-raised">
                  {visibleSongs.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      onOpen={() => handleOpen(project.id)}
                      onDelete={() => {
                        setPendingDelete(project);
                        setDeleteOpen(true);
                      }}
                      onAddToPlaylist={() => {
                        setPlaylistTarget(project);
                        setPlaylistModalOpen(true);
                      }}
                      onRemoveFromPlaylist={
                        selectedPlaylist
                          ? () => removeSong(selectedPlaylist.id, project.id)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </>
            ) : selectedPlaylist ? (
              <EmptyState
                icon={<ListMusic className="size-5" />}
                title="No projects in this playlist"
                body="Add projects with the playlist button on any project"
              />
            ) : (
              <EmptyState
                icon={<Music className="size-5" />}
                title="No projects yet"
                body="Create a project from a video, an audio file, YouTube or Jellyfin"
              />
            )}
          </section>
        </div>
      </div>

      <NewSongModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <AddToPlaylistModal
        open={playlistModalOpen}
        project={playlistTarget}
        onClose={() => setPlaylistModalOpen(false)}
      />

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

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-14 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-surface-high text-on-surface-variant">
        {icon}
      </div>
      <p className="text-sm font-medium text-on-surface">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-balance text-on-surface-variant">
        {body}
      </p>
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
