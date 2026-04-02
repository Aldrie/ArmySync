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

export default function EffectsSidebar() {
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
    </div>
  );
}
