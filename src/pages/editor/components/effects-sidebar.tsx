import { Upload } from 'lucide-react';

import EffectPresetCard from './effect-preset-card';

const PRESETS = [
  {
    id: 'dynamite-disco',
    title: 'Dynamite Disco',
    subtitle: 'Retro Retro Pops',
  },
  { id: 'purple-ocean', title: 'Purple Ocean', subtitle: 'Slow Wave Fade' },
  { id: 'spring-day', title: 'Spring Day', subtitle: 'Soft Pastel Glow' },
];

interface EffectsSidebarProps {
  onLoadEffectFile: () => void;
}

export default function EffectsSidebar({
  onLoadEffectFile,
}: EffectsSidebarProps) {
  return (
    <div className="h-full bg-surface-low flex flex-col py-5 px-4 gap-3">
      <span className="font-display font-bold text-xs tracking-widest uppercase text-on-surface-variant">
        Effects
      </span>

      <div className="flex flex-col gap-2 flex-1">
        {PRESETS.map((preset) => (
          <EffectPresetCard
            key={preset.id}
            title={preset.title}
            subtitle={preset.subtitle}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <button
          type="button"
          className="w-full py-2.5 rounded-md font-display font-bold text-sm text-on-primary cursor-pointer transition-opacity hover:opacity-90"
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))',
          }}
          onClick={onLoadEffectFile}
        >
          Sync Lightstick
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer py-1.5"
          onClick={onLoadEffectFile}
        >
          <Upload size={12} />
          Load from file
        </button>
      </div>
    </div>
  );
}
