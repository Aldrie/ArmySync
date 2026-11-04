import { useCallback, useState } from 'react';

import ColorPickerPopover from '../../../../components/color-picker-popover';

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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const handleToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchor((prev) => (prev ? null : (e.currentTarget as HTMLElement)));
  }, []);

  const handleClose = useCallback(() => setAnchor(null), []);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <button
        type="button"
        aria-label={`${label}: ${value}`}
        aria-expanded={anchor !== null}
        className="flex h-7 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-container pr-2.5 pl-1 transition-colors hover:border-outline-variant"
        onClick={handleToggle}
      >
        <span
          className="size-5 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-[11px] text-on-surface uppercase tabular-nums">
          {value}
        </span>
      </button>

      {anchor && (
        <ColorPickerPopover
          color={value}
          anchor={anchor}
          onChange={onChange}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
