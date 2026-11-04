import EffectPalette from './effect-palette';
import PropertiesPanel from './properties-panel';
import { useEditorStore } from '../../../stores/editor-store';

export default function EffectsSidebar() {
  const selectedEffectIds = useEditorStore((s) => s.selectedEffectIds);
  const effects = useEditorStore((s) => s.effects);

  const selectedEffect =
    selectedEffectIds.length === 1
      ? (effects.find((e) => e.id === selectedEffectIds[0]) ?? null)
      : null;

  return (
    <div className="h-full bg-surface-low border-r border-border flex flex-col overflow-y-auto">
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
