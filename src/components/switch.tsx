import { cn } from '../lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy: string;
  disabled?: boolean;
}

export default function Switch({
  checked,
  onChange,
  labelledBy,
  disabled,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] disabled:cursor-default disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-surface-highest',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-200 ease-out',
          checked && 'translate-x-4',
        )}
      />
    </button>
  );
}
