import { Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import EffectPreviewCanvas from './effect-preview-canvas';
import FieldRenderer from './fields/field-renderer';
import IconButton from '../../../components/icon-button';
import { getEffectDefinition } from '../../../domains/effects';
import type { EffectInstance } from '../../../domains/effects';
import { useEditorStore } from '../../../stores/editor-store';

interface PropertiesPanelProps {
  effect: EffectInstance;
}

export default function PropertiesPanel({ effect }: PropertiesPanelProps) {
  const definition = getEffectDefinition(effect.type);
  const updateEffectParams = useEditorStore((s) => s.updateEffectParams);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      updateEffectParams(effect.id, { [key]: value });
    },
    [effect.id, updateEffectParams],
  );

  if (!definition) return null;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="block font-display font-bold text-sm text-on-surface">
            {definition.label}
          </span>
          <span className="block text-[10px] text-on-surface-variant mt-0.5">
            {definition.description}
          </span>
        </div>
        <IconButton onClick={() => deleteSelection()}>
          <Trash2 />
        </IconButton>
      </div>

      <EffectPreviewCanvas effectType={effect.type} params={effect.params} />

      {definition.fields.length > 0 && (
        <div className="flex flex-col gap-3">
          {definition.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={effect.params[field.key]}
              onChange={handleFieldChange}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant">
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">Start</span>
          <span className="text-xs text-on-surface font-mono tabular-nums">
            {effect.from.toFixed(2)}s
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">End</span>
          <span className="text-xs text-on-surface font-mono tabular-nums">
            {effect.to.toFixed(2)}s
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">Duration</span>
          <span className="text-xs text-on-surface font-mono tabular-nums">
            {(effect.to - effect.from).toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
}
