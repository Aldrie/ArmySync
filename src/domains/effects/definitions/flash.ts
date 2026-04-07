import type { EffectDefinition } from '../types';

function bpmToHz(bpm: number): number {
  return bpm / 60;
}

export const flashDefinition: EffectDefinition = {
  type: 'flash',
  label: 'Strobe / Flash',
  description: 'Rapidly cycle through multiple colors',
  icon: 'Zap',
  defaultDuration: 5,

  handler: ({ params, current }) => {
    const colors = (params.colors as string[]) ?? ['#ffffff', '#000000'];
    const bpm = (params.bpm as number) ?? 240;
    const hz = bpmToHz(bpm);
    const index = Math.floor(current * hz) % colors.length;
    return colors[index];
  },

  fields: [
    {
      key: 'colors',
      label: 'Colors',
      type: 'color-list',
      default: ['#ffffff', '#000000'],
      min: 2,
      max: 8,
    },
    {
      key: 'bpm',
      label: 'BPM',
      type: 'number',
      default: 240,
      min: 30,
      max: 1200,
      step: 1,
    },
    {
      key: 'bpm',
      label: 'Tap Sync',
      type: 'tap-sync',
      default: 240,
    },
  ],

  renderPreview: (ctx, width, height, params) => {
    const colors = (params.colors as string[]) ?? ['#ffffff', '#000000'];
    const bpm = (params.bpm as number) ?? 240;
    const hz = bpmToHz(bpm);
    const previewDuration = 2;
    const totalBeats = Math.ceil(previewDuration * hz);
    const beatWidth = width / Math.max(totalBeats, 1);

    for (let i = 0; i < totalBeats; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(Math.round(i * beatWidth), 0, Math.ceil(beatWidth), height);
    }
  },

  buildStripBackground: (params, duration) => {
    const colors = (params.colors as string[]) ?? ['#ffffff', '#000000'];
    const bpm = (params.bpm as number) ?? 240;
    const hz = bpmToHz(bpm);
    const totalBeats = Math.max((duration ?? 5) * hz, 1);
    const beatPct = 100 / totalBeats;

    const stops = colors
      .map((color, i) => {
        const start = (beatPct * i).toFixed(4);
        const end = (beatPct * (i + 1)).toFixed(4);
        return `${color} ${start}%, ${color} ${end}%`;
      })
      .join(', ');

    return `repeating-linear-gradient(to right, ${stops})`;
  },
};
