import { useCallback } from 'react';

import Slider from '../../../../components/slider';

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export default function NumberField({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: NumberFieldProps) {
  const handleSliderChange = useCallback(
    (v: number) => onChange(v),
    [onChange],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">{label}</span>
        <span className="text-xs text-on-surface font-mono tabular-nums">
          {value}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        variant="fill"
        className="w-full h-1.5 rounded-sm"
        onChange={handleSliderChange}
      />
    </div>
  );
}
