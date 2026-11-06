import { ChevronLeft, Monitor, Pencil } from 'lucide-react';
import { useRef } from 'react';

import PlayerVideo from './components/player-video';
import IconButton from '../../components/icon-button';
import { LightstickPreview, useStickColor } from '../../domains/lightstick';
import { cn } from '../../lib/cn';
import { modKey } from '../../lib/keys';
import type { PlayerMode } from '../../lib/settings';
import { useKeybind } from '../../lib/use-keybind';
import { useAppStore } from '../../stores/app-store';
import { usePlayerStore } from '../../stores/player-store';

export default function PlayerPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useStickColor(rootRef);

  const project = useAppStore((s) => s.activeProject);
  const closePlayer = useAppStore((s) => s.closePlayer);
  const openProject = useAppStore((s) => s.openProject);
  const mode = usePlayerStore((s) => s.mode);
  const ready = usePlayerStore((s) => s.ready);
  const setMode = usePlayerStore((s) => s.setMode);

  const transport =
    (run: (s: ReturnType<typeof usePlayerStore.getState>) => void) => () => {
      const s = usePlayerStore.getState();
      if (!s.mediaError) run(s);
    };
  useKeybind(
    {
      Space: transport((s) => s.togglePlay()),
      ArrowLeft: transport((s) => s.seekDelta(-10)),
      ArrowRight: transport((s) => s.seekDelta(10)),
    },
    { allowRange: true },
  );

  const handleEdit = () => {
    if (!project) return;
    openProject(project.id).catch((e: unknown) =>
      console.error('Failed to open project:', e),
    );
  };

  const modeButton = (
    value: PlayerMode,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={mode === value}
      onClick={() => void setMode(value)}
      className={cn(
        'flex h-7 w-8.5 cursor-pointer items-center justify-center rounded-md transition-colors [&_svg]:size-[15px]',
        mode === value
          ? 'bg-surface-highest text-on-surface shadow-raised'
          : 'text-outline hover:text-on-surface',
      )}
    >
      {icon}
    </button>
  );

  return (
    <div ref={rootRef} className="flex h-full flex-col bg-surface-dim">
      <header className="flex h-14 shrink-0 items-center gap-1 px-3.5">
        <IconButton
          size="md"
          label="Back to library"
          title={`Back to library (${modKey}W)`}
          onClick={closePlayer}
        >
          <ChevronLeft />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">
          {project?.name}
        </h1>
        <div
          role="group"
          aria-label="View"
          className="mr-2 flex gap-0.5 rounded-lg border border-border bg-surface-low p-0.5"
        >
          {modeButton('video', 'Video', <Monitor />)}
          {modeButton('lights', 'Lights only', <StickIcon />)}
        </div>
        <IconButton size="md" label="Open in editor" onClick={handleEdit}>
          <Pencil />
        </IconButton>
      </header>

      {ready &&
        (mode === 'video' ? (
          <PlayerVideo />
        ) : (
          <main className="flex min-h-0 flex-1 items-center justify-center">
            <LightstickPreview height={320} />
          </main>
        ))}
    </div>
  );
}

function StickIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="5.5" />
      <path d="M10.5 13.5v8h3v-8" />
    </svg>
  );
}
