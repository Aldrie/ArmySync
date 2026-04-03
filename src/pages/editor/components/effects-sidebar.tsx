import EffectPalette from './effect-palette';
import PropertiesPanel from './properties-panel';
import { useEditorStore } from '../../../stores/editor-store';

export default function EffectsSidebar() {
  const selectedEffectId = useEditorStore((s) => s.selectedEffectId);
  const effects = useEditorStore((s) => s.effects);

  const selectedEffect = selectedEffectId
    ? (effects.find((e) => e.id === selectedEffectId) ?? null)
    : null;

  return (
    <div className="h-full bg-surface-low flex flex-col py-5 px-4 gap-4 overflow-y-auto">
      <div className="flex flex-col gap-3 px-3">
        <span className="font-display font-bold text-xs tracking-widest uppercase text-on-surface-variant">
          Effects
        </span>
        <EffectPalette />
      </div>

      {selectedEffect && (
        <div className="flex flex-col gap-3 pt-6 mt-3 border-t border-outline-variant px-3">
          <span className="font-display font-bold text-xs tracking-widest uppercase text-on-surface-variant">
            Properties
          </span>
          <PropertiesPanel effect={selectedEffect} />
        </div>
      )}
    </div>
  );
}
