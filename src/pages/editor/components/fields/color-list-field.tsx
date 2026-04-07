import { Plus, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import ColorPickerPopover from '../../../../components/color-picker-popover';

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
              className="cursor-pointer"
              onClick={(e) => {
                const next = activeIndex === i ? null : i;
                setActiveIndex(next);
                setAnchor(
                  next !== null ? (e.currentTarget as HTMLElement) : null,
                );
              }}
            >
              <div
                className={`w-7 h-7 rounded-md border transition-colors ${
                  activeIndex === i
                    ? 'border-primary ring-1 ring-primary/40'
                    : 'border-outline-variant'
                }`}
                style={{ backgroundColor: color }}
              />
            </button>
            {value.length > min && (
              <button
                type="button"
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-danger rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => handleRemove(i)}
              >
                <X className="size-2 text-white" />
              </button>
            )}
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            className="w-7 h-7 rounded-md border border-dashed border-outline-variant flex items-center justify-center hover:border-on-surface-variant transition-colors cursor-pointer"
            onClick={handleAdd}
          >
            <Plus className="size-3 text-on-surface-variant" />
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
