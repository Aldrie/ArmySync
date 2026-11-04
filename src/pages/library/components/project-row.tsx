import { ChevronRight, ListMinus, ListPlus, Music, Trash2 } from 'lucide-react';

import IconButton from '../../../components/icon-button';
import type { ProjectSummary } from '../../../domains/project';

interface ProjectRowProps {
  project: ProjectSummary;
  onOpen: () => void;
  onDelete: () => void;
  onAddToPlaylist: () => void;
  onRemoveFromPlaylist?: () => void;
}

export default function ProjectRow({
  project,
  onOpen,
  onDelete,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}: ProjectRowProps) {
  const date = new Date(project.updatedAt);

  return (
    <div className="group flex items-center pr-2 transition-colors hover:bg-surface-container">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-3.5 text-left focus-visible:-outline-offset-2"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-high text-on-surface-variant transition-colors group-hover:text-on-surface">
          <Music className="size-4" />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
          {project.name}
        </p>
        <time
          dateTime={date.toISOString()}
          title={date.toLocaleString()}
          className="shrink-0 text-xs text-outline tabular-nums"
        >
          {formatTimeAgo(date)}
        </time>
        <ChevronRight className="size-4 shrink-0 -translate-x-1 text-outline opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </button>
      <IconButton
        label="Add to playlist"
        className="ml-1"
        onClick={onAddToPlaylist}
      >
        <ListPlus />
      </IconButton>
      {onRemoveFromPlaylist && (
        <IconButton label="Remove from playlist" onClick={onRemoveFromPlaylist}>
          <ListMinus />
        </IconButton>
      )}
      <IconButton label="Delete song" onClick={onDelete}>
        <Trash2 />
      </IconButton>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
