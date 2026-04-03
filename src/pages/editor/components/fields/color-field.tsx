import { useCallback, useRef } from 'react';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorField({
  label,
  value,
  onChange,
}: ColorFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <button
        type="button"
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <div
          className="w-6 h-6 rounded-md border border-outline-variant"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs text-on-surface font-mono uppercase">
          {value}
        </span>
        <input
          ref={inputRef}
          type="color"
          className="sr-only"
          value={value}
          onChange={handleChange}
        />
      </button>
    </div>
  );
}
