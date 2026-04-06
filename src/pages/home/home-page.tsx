import { FolderOpen, Plus, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { open } from '@tauri-apps/plugin-dialog';

import NewProjectModal from './components/new-project-modal';
import { useAppStore } from '../../stores/app-store';
import type { RecentProject } from '../../stores/app-store';

export default function HomePage() {
  const recentProjects = useAppStore((s) => s.recentProjects);
  const loadRecentProjects = useAppStore((s) => s.loadRecentProjects);
  const openProject = useAppStore((s) => s.openProject);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void loadRecentProjects();
  }, [loadRecentProjects]);

  const handleOpenProject = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      await openProject(selected);
    }
  };

  return (
    <div className="flex h-screen flex-col items-center bg-surface">
      <div className="flex w-full max-w-2xl flex-1 flex-col px-6 pt-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">
              ArmySync
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant">
            Lightstick animation editor for BTS Army Bombs
          </p>
        </div>

        {/* Actions */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
          <button
            onClick={() => void handleOpenProject()}
            className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-5 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-high"
          >
            <FolderOpen className="h-4 w-4" />
            Open Project
          </button>
        </div>

        {/* Recent projects */}
        <div className="flex-1">
          {recentProjects.length > 0 && (
            <>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                <Clock className="h-3.5 w-3.5" />
                Recent Projects
              </div>
              <div className="flex flex-col gap-1">
                {recentProjects.map((project) => (
                  <RecentProjectRow
                    key={project.dir}
                    project={project}
                    onOpen={() => void openProject(project.dir)}
                  />
                ))}
              </div>
            </>
          )}

          {recentProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-outline-variant" />
              <p className="text-sm text-on-surface-variant">
                No recent projects
              </p>
              <p className="mt-1 text-xs text-outline">
                Create a new project or open an existing one to get started
              </p>
            </div>
          )}
        </div>
      </div>

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function RecentProjectRow({
  project,
  onOpen,
}: {
  project: RecentProject;
  onOpen: () => void;
}) {
  const date = new Date(project.updatedAt);
  const timeAgo = formatTimeAgo(date);

  return (
    <button
      onClick={onOpen}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-container"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-high text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">
          {project.name}
        </p>
        <p className="truncate text-xs text-outline">{project.dir}</p>
      </div>
      <span className="shrink-0 text-xs text-outline">{timeAgo}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-outline-variant opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
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
