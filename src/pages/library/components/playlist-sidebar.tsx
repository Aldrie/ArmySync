import { Library, ListMusic, Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import Button from '../../../components/button';
import IconButton from '../../../components/icon-button';
import Modal from '../../../components/modal';
import type { Playlist } from '../../../domains/playlists';
import { cn } from '../../../lib/cn';
import { usePlaylistStore } from '../../../stores/playlist-store';

export default function PlaylistSidebar() {
  const playlists = usePlaylistStore((s) => s.playlists);
  const selectedId = usePlaylistStore((s) => s.selectedId);
  const select = usePlaylistStore((s) => s.select);
  const create = usePlaylistStore((s) => s.create);
  const rename = usePlaylistStore((s) => s.rename);
  const remove = usePlaylistStore((s) => s.remove);

  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Playlist | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTitleId = useId();

  return (
    <nav aria-label="Playlists" className="flex flex-col gap-0.5">
      <SidebarItem
        icon={<Library />}
        selected={selectedId === null}
        onSelect={() => select(null)}
      >
        All songs
      </SidebarItem>

      <div className="mt-5 mb-1 flex items-center justify-between pr-1 pl-2.5">
        <h2 className="text-xs font-semibold text-on-surface-variant">
          Playlists
        </h2>
        <IconButton label="New playlist" onClick={() => setCreating(true)}>
          <Plus />
        </IconButton>
      </div>

      {creating && (
        <NameInput
          label="New playlist name"
          initial=""
          onSubmit={(name) => {
            create(name);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {playlists.map((playlist) =>
        renamingId === playlist.id ? (
          <NameInput
            key={playlist.id}
            label="Playlist name"
            initial={playlist.name}
            onSubmit={(name) => {
              rename(playlist.id, name);
              setRenamingId(null);
            }}
            onCancel={() => setRenamingId(null)}
          />
        ) : (
          <SidebarItem
            key={playlist.id}
            icon={<ListMusic />}
            selected={selectedId === playlist.id}
            onSelect={() => select(playlist.id)}
            actions={
              <>
                <IconButton
                  label="Rename playlist"
                  onClick={() => setRenamingId(playlist.id)}
                >
                  <Pencil />
                </IconButton>
                <IconButton
                  label="Delete playlist"
                  onClick={() => {
                    setPendingDelete(playlist);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 />
                </IconButton>
              </>
            }
          >
            {playlist.name}
          </SidebarItem>
        ),
      )}

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
            Delete playlist “{pendingDelete?.name}”?
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Songs stay in your library.
          </p>
        </div>
        <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-surface-low/60 px-6 py-4">
          <Button intent="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            intent="danger"
            onClick={() => {
              if (pendingDelete) remove(pendingDelete.id);
              setDeleteOpen(false);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </nav>
  );
}

function SidebarItem({
  icon,
  selected,
  onSelect,
  actions,
  children,
}: {
  icon: ReactNode;
  selected: boolean;
  onSelect: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'group flex items-center rounded-lg pr-1 transition-colors',
        selected
          ? 'bg-primary/10 text-primary'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
      )}
    >
      <button
        type="button"
        aria-current={selected ? 'page' : undefined}
        onClick={onSelect}
        className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2.5 pl-2.5 text-left text-sm font-medium [&_svg]:size-4 [&_svg]:shrink-0"
      >
        {icon}
        <span className="truncate">{children}</span>
      </button>
      {actions && (
        <div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

function NameInput({
  label,
  initial,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <input
      type="text"
      aria-label={label}
      value={value}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmit(value);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={onCancel}
      className="h-8 w-full min-w-0 rounded-lg border border-border-strong bg-surface-low px-2.5 text-sm text-on-surface outline-none transition-[border-color,box-shadow] placeholder:text-outline focus:border-primary/70 focus:ring-3 focus:ring-primary/15"
    />
  );
}
