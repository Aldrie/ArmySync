import { forwardRef, useCallback, useRef, useImperativeHandle } from 'react';

import { cn } from '../lib/cn';

export interface SliderRef {
  setValue: (value: number) => void;
}

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (value: number) => void;
}

const Slider = forwardRef<SliderRef, SliderProps>(function Slider(
  {
    min = 0,
    max = 100,
    step = 1,
    defaultValue = 0,
    'aria-label': ariaLabel,
    disabled,
    className = '',
    onChange,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFill = useCallback(
    (value: number) => {
      if (!inputRef.current) return;
      const percent = ((value - min) / (max - min)) * 100;
      inputRef.current.style.backgroundSize = `${percent}% 100%`;
    },
    [min, max],
  );

  useImperativeHandle(ref, () => ({
    setValue: (value: number) => {
      if (inputRef.current) {
        inputRef.current.value = String(value);
        updateFill(value);
      }
    },
  }));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      updateFill(value);
      onChange?.(value);
    },
    [updateFill, onChange],
  );

  return (
    <input
      ref={inputRef}
      type="range"
      className={cn('range-fill disabled:opacity-30', className)}
      min={min}
      max={max}
      step={step}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      disabled={disabled}
      style={{
        backgroundSize: `${((defaultValue - min) / (max - min)) * 100}% 100%`,
      }}
      onChange={handleChange}
    />
  );
});

export default Slider;
