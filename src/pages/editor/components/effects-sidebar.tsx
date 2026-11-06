import { ChevronLeft } from 'lucide-react';

import EffectPalette from './effect-palette';
import PropertiesPanel from './properties-panel';
import IconButton from '../../../components/icon-button';
import { modKey } from '../../../lib/keys';
import { useAppStore } from '../../../stores/app-store';
import { useEditorStore } from '../../../stores/editor-store';

export default function EffectsSidebar() {
  const selectedEffectIds = useEditorStore((s) => s.selectedEffectIds);
  const effects = useEditorStore((s) => s.effects);
  const isDirty = useEditorStore((s) => s.isDirty);
  const projectName = useAppStore((s) => s.activeProject?.name);
  const closeProject = useAppStore((s) => s.closeProject);

  const selectedEffect =
    selectedEffectIds.length === 1
      ? (effects.find((e) => e.id === selectedEffectIds[0]) ?? null)
      : null;

  return (
    <div className="h-full bg-surface-low border-r border-border flex flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 flex h-11 shrink-0 items-center gap-1 border-b border-border bg-surface-low px-2">
        <IconButton
          label={`Back to library (${modKey}W)`}
          onClick={closeProject}
        >
          <ChevronLeft />
        </IconButton>
        <span className="truncate text-sm font-semibold text-on-surface">
          {projectName || 'Untitled'}
        </span>
        {isDirty && (
          <span
            title="Unsaved changes"
            aria-label="Unsaved changes"
            className="ml-1 size-1.5 shrink-0 rounded-full bg-primary"
          />
        )}
      </header>
      <section className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold text-on-surface">Effects</h2>
          <span className="text-[11px] text-outline">
            Drag onto the timeline
          </span>
        </div>
        <EffectPalette />
      </section>

      {selectedEffect && (
        <section className="flex flex-col gap-3 border-t border-border p-4">
          <h2 className="text-xs font-semibold text-on-surface">Properties</h2>
          <PropertiesPanel key={selectedEffect.id} effect={selectedEffect} />
        </section>
      )}
    </div>
  );
}
