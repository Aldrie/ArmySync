import { Plus, X } from 'lucide-react';
import { useCallback } from 'react';

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
      onChange(value.filter((_, i) => i !== index));
    },
    [value, min, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {value.map((color, i) => (
          <div key={i} className="relative group">
            <label className="cursor-pointer">
              <div
                className="w-7 h-7 rounded-md border border-outline-variant"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                className="sr-only"
                value={color}
                onChange={(e) => handleColorChange(i, e.target.value)}
              />
            </label>
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
    </div>
  );
}
