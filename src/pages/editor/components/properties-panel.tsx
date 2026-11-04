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

  const timing = [
    { label: 'Start', value: effect.from },
    { label: 'End', value: effect.to },
    { label: 'Duration', value: effect.to - effect.from },
  ];

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block font-medium text-[13px] text-on-surface">
            {definition.label}
          </span>
          <span className="block text-[11px] text-on-surface-variant mt-0.5">
            {definition.description}
          </span>
        </div>
        <IconButton
          label="Delete effect"
          className="-mt-1 -mr-1 hover:bg-error/10 hover:text-error"
          onClick={() => deleteSelection()}
        >
          <Trash2 />
        </IconButton>
      </div>

      <EffectPreviewCanvas effectType={effect.type} params={effect.params} />

      {definition.fields.length > 0 && (
        <div className="flex flex-col gap-3.5">
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

      <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface-container">
        {timing.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 px-3 py-2">
            <dt className="text-[11px] text-on-surface-variant">{label}</dt>
            <dd className="text-xs font-medium text-on-surface tabular-nums">
              {value.toFixed(2)}s
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
