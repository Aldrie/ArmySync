import { useCallback } from 'react';

import * as format from '../../../../lib/format';

interface DurationFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export default function DurationField({
  label,
  value,
  min = 0,
  max = 600,
  onChange,
}: DurationFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(min, Math.min(max, Number(e.target.value)));
      onChange(v);
    },
    [onChange, min, max],
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-outline tabular-nums">
          {format.videoTime(value)}
        </span>
        <input
          type="number"
          aria-label={label}
          className="h-7 rounded-md border border-border-strong bg-surface-container text-xs text-on-surface outline-none transition-[border-color,box-shadow] hover:border-outline-variant focus:border-primary/70 focus:ring-3 focus:ring-primary/15 w-16 px-2 text-right tabular-nums"
          value={value.toFixed(1)}
          min={min}
          max={max}
          step={0.1}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
