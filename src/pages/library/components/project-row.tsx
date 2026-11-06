import {
  ChevronRight,
  ListMinus,
  ListPlus,
  Music,
  Play,
  Trash2,
} from 'lucide-react';

import JellyfinIcon from '../../../assets/jellyfin.svg?react';
import IconButton from '../../../components/icon-button';
import type { ProjectSummary } from '../../../domains/project';

interface ProjectRowProps {
  project: ProjectSummary;
  onOpen: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onAddToPlaylist: () => void;
  onRemoveFromPlaylist?: () => void;
}

export default function ProjectRow({
  project,
  onOpen,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}: ProjectRowProps) {
  const date = new Date(project.updatedAt);

  return (
    <div className="group flex items-center pr-2 transition-colors focus-within:bg-surface-container hover:bg-surface-container">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-3.5 text-left focus-visible:-outline-offset-2"
      >
        <div
          title={project.jellyfinItemId ? 'Streams from Jellyfin' : undefined}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-high text-on-surface-variant transition-colors group-hover:text-on-surface"
        >
          {project.jellyfinItemId ? (
            <JellyfinIcon
              className="size-4"
              role="img"
              aria-label="Streams from Jellyfin"
            />
          ) : (
            <Music className="size-4" />
          )}
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
      <span
        aria-hidden="true"
        className="ml-2 flex size-7 items-center justify-center rounded-full border border-border-strong text-on-surface-variant group-focus-within:hidden group-hover:hidden"
      >
        <Play className="ml-px size-2.5 fill-current" />
      </span>
      <div className="ml-2 hidden items-center gap-0.5 group-focus-within:flex group-hover:flex">
        <button
          type="button"
          aria-label={`Play ${project.name}`}
          onClick={onPlay}
          className="mr-0.5 flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-primary/10 pr-2.5 pl-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <Play className="size-3 fill-current" />
          Play
        </button>
        <IconButton label="Add to playlist" onClick={onAddToPlaylist}>
          <ListPlus />
        </IconButton>
        {onRemoveFromPlaylist && (
          <IconButton
            label="Remove from playlist"
            onClick={onRemoveFromPlaylist}
          >
            <ListMinus />
          </IconButton>
        )}
        <IconButton label="Delete project" onClick={onDelete}>
          <Trash2 />
        </IconButton>
      </div>
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
