import { cn } from '../../../lib/cn';

interface EffectPresetCardProps {
  title: string;
  subtitle: string;
  active?: boolean;
  onClick?: () => void;
}

export default function EffectPresetCard({
  title,
  subtitle,
  active,
  onClick,
}: EffectPresetCardProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full text-left p-3 rounded-md cursor-pointer transition-colors',
        active
          ? 'bg-surface-highest'
          : 'bg-surface-high hover:bg-surface-highest',
      )}
      onClick={onClick}
    >
      <span className="block font-display font-bold text-sm text-on-surface">
        {title}
      </span>
      <span className="block text-xs text-on-surface-variant mt-0.5">
        {subtitle}
      </span>
    </button>
  );
}
