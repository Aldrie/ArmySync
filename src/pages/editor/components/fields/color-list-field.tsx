import { Plus, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import ColorPickerPopover from '../../../../components/color-picker-popover';
import { useHistoryBatch } from '../../../../stores/editor-store';

interface ColorListFieldProps {
  label: string;
  value: string[];
  min?: number;
  max?: number;
  onChange: (value: string[]) => void;
}

export default function ColorListField({
  label,
  value,
  min = 1,
  max = 8,
  onChange,
}: ColorListFieldProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useHistoryBatch(activeIndex);
  const swatchRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const handleColorChange = useCallback(
    (index: number, color: string) => {
      const next = [...value];
      next[index] = color;
      onChange(next);
    },
    [value, onChange],
  );

  const handleAdd = useCallback(() => {
    if (value.length >= max) return;
    onChange([...value, '#ffffff']);
  }, [value, max, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      if (value.length <= min) return;
      if (activeIndex === index) setActiveIndex(null);
      onChange(value.filter((_, i) => i !== index));
    },
    [value, min, activeIndex, onChange],
  );

  const handleClose = useCallback(() => {
    setActiveIndex(null);
    setAnchor(null);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {value.map((color, i) => (
          <div key={i} className="relative group">
            <button
              ref={(el) => {
                if (el) swatchRefs.current.set(i, el);
                else swatchRefs.current.delete(i);
              }}
              type="button"
              aria-label={`${label} ${i + 1}: ${color}`}
              className="block cursor-pointer rounded-md"
              onClick={(e) => {
                const next = activeIndex === i ? null : i;
                setActiveIndex(next);
                setAnchor(
                  next !== null ? (e.currentTarget as HTMLElement) : null,
                );
              }}
            >
              <div
                className={`size-7 rounded-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] transition-shadow ${
                  activeIndex === i
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-low'
                    : ''
                }`}
                style={{ backgroundColor: color }}
              />
            </button>
            {value.length > min && (
              <button
                type="button"
                aria-label={`Remove ${color}`}
                className="absolute -top-1.5 -right-1.5 size-4 bg-error rounded-full shadow-[0_0_0_2px_var(--color-surface-low)] focus-visible:opacity-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => handleRemove(i)}
              >
                <X className="size-2 text-on-error" strokeWidth={3} />
              </button>
            )}
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            aria-label="Add color"
            className="size-7 rounded-md border border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            onClick={handleAdd}
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      {activeIndex !== null && activeIndex < value.length && (
        <ColorPickerPopover
          color={value[activeIndex]}
          anchor={anchor}
          onChange={(c) => handleColorChange(activeIndex, c)}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
