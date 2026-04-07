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
        className="flex items-center gap-2 cursor-pointer"
        onClick={handleToggle}
      >
        <div
          className="w-6 h-6 rounded-md border border-outline-variant"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs text-on-surface font-mono uppercase">
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
