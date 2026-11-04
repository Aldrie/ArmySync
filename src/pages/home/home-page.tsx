import { FolderOpen, Plus, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

import { open } from '@tauri-apps/plugin-dialog';

import NewProjectModal from './components/new-project-modal';
import AppIcon from '../../assets/icon.svg?react';
import Button from '../../components/button';
import { modKey } from '../../lib/keys';
import { useAppStore } from '../../stores/app-store';
import type { RecentProject } from '../../stores/app-store';

export default function HomePage() {
  const recentProjects = useAppStore((s) => s.recentProjects);
  const loadRecentProjects = useAppStore((s) => s.loadRecentProjects);
  const openProject = useAppStore((s) => s.openProject);
  const modalOpen = useAppStore((s) => s.showNewProjectModal);
  const setModalOpen = useAppStore((s) => s.setShowNewProjectModal);
  const pendingDir = useAppStore((s) => s.pendingDir);

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

        <div className="mb-12 flex items-center justify-center gap-3">
          <Button intent="primary" size="lg" onClick={() => setModalOpen(true)}>
            <Plus />
            New Project
            <Kbd>{modKey}N</Kbd>
          </Button>
          <Button size="lg" onClick={() => void handleOpenProject()}>
            <FolderOpen />
            Open Project
            <Kbd>{modKey}O</Kbd>
          </Button>
        </div>

        <section className="flex-1">
          {recentProjects.length > 0 && (
            <>
              <h2 className="mb-2.5 px-1 text-xs font-semibold text-on-surface-variant">
                Recent projects
              </h2>
              <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-low shadow-raised">
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-14 text-center">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-surface-high text-on-surface-variant">
                <FolderOpen className="size-5" />
              </div>
              <p className="text-sm font-medium text-on-surface">
                No recent projects
              </p>
              <p className="mt-1 max-w-xs text-xs text-balance text-on-surface-variant">
                Create a new project or open an existing one to get started
              </p>
            </div>
          )}
        </section>
      </div>

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        prefillDir={pendingDir}
      />
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
      type="button"
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-container focus-visible:-outline-offset-2"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-high text-on-surface-variant transition-colors group-hover:text-primary">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">
          {project.name}
        </p>
        <p className="truncate text-xs text-outline">{project.dir}</p>
      </div>
      <time
        dateTime={date.toISOString()}
        title={date.toLocaleString()}
        className="shrink-0 text-xs text-outline tabular-nums"
      >
        {timeAgo}
      </time>
      <ChevronRight className="size-4 shrink-0 -translate-x-1 text-outline opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
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
