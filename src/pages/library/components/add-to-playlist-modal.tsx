import { useId } from 'react';

import Button from '../../../components/button';
import Modal from '../../../components/modal';
import type { ProjectSummary } from '../../../domains/project';
import { usePlaylistStore } from '../../../stores/playlist-store';

interface AddToPlaylistModalProps {
  open: boolean;
  project: ProjectSummary | null;
  onClose: () => void;
}

export default function AddToPlaylistModal({
  open,
  project,
  onClose,
}: AddToPlaylistModalProps) {
  const playlists = usePlaylistStore((s) => s.playlists);
  const add = usePlaylistStore((s) => s.add);
  const removeSong = usePlaylistStore((s) => s.removeSong);
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="flex w-sm flex-col"
    >
      <div className="px-6 pt-6 pb-4">
        <h2
          id={titleId}
          className="font-display text-lg font-bold tracking-tight text-on-surface"
        >
          Add “{project?.name}” to playlists
        </h2>
      </div>

      <div className="max-h-72 overflow-y-auto px-6 pb-5">
        {playlists.length > 0 ? (
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-low">
            {playlists.map((playlist) => {
              const checked =
                !!project && playlist.projectIds.includes(project.id);
              return (
                <label
                  key={playlist.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (!project) return;
                      if (checked) removeSong(playlist.id, project.id);
                      else add(playlist.id, project.id);
                    }}
                    className="size-4 cursor-pointer accent-primary"
                  />
                  <span className="truncate">{playlist.name}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">
            No playlists yet. Create one with the + button in the sidebar.
          </p>
        )}
      </div>

      <div className="flex justify-end rounded-b-xl border-t border-border bg-surface-low/60 px-6 py-4">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
