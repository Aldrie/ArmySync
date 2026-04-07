import { useCallback, useEffect, useMemo, useRef } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { createPortal } from 'react-dom';

interface ColorPickerPopoverProps {
  color: string;
  anchor: HTMLElement | null;
  onChange: (color: string) => void;
  onClose: () => void;
}

export default function ColorPickerPopover({
  color,
  anchor,
  onChange,
  onClose,
}: ColorPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const position = useMemo(() => {
    if (!anchor) return { top: 0, left: 0 };
    const rect = anchor.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: Math.max(8, rect.left - 100),
    };
  }, [anchor]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchor &&
        !anchor.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [anchor, onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-100 rounded-lg border border-outline-variant bg-surface-container p-3 shadow-xl"
      style={{ top: position.top, left: position.left }}
    >
      <HexColorPicker color={color} onChange={onChange} />
      <HexColorInput
        color={color}
        onChange={onChange}
        prefixed
        className="mt-2 w-full rounded-md border border-outline-variant bg-surface-high px-2.5 py-1.5 text-xs font-mono text-on-surface outline-none focus:border-primary"
      />
    </div>,
    document.body,
  );
}
