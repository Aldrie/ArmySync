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
        <span className="text-xs text-on-surface-variant font-mono tabular-nums">
          {format.videoTime(value)}
        </span>
        <input
          type="number"
          className="bg-surface-high text-on-surface text-xs rounded-md px-2 py-1.5 border border-outline-variant outline-none w-16 text-right font-mono tabular-nums"
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
