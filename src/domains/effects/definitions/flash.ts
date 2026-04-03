import type { EffectDefinition } from '../types';

const FLASH_STOP_SIZE = 5;

export const flashDefinition: EffectDefinition = {
  type: 'flash',
  label: 'Strobe / Flash',
  description: 'Rapidly cycle through multiple colors',
  defaultDuration: 2,

  handler: ({ params, current }) => {
    const colors = (params.colors as string[]) ?? ['#ffffff', '#000000'];
    const velocity = (params.velocity as number) ?? 20;
    const index = Math.floor(current * velocity) % colors.length;
    return colors[index];
  },

  uiConfig: [
    {
      key: 'colors',
      label: 'Colors',
      type: 'color-list',
      default: ['#ffffff', '#000000'],
      min: 2,
      max: 8,
    },
    {
      key: 'velocity',
      label: 'Speed',
      type: 'number',
      default: 20,
      min: 1,
      max: 100,
      step: 1,
    },
  ],

  renderPreview: (ctx, width, height, params) => {
    const colors = (params.colors as string[]) ?? ['#ffffff', '#000000'];
    const barWidth = width / Math.max(colors.length, 1);

    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(i * barWidth), 0, Math.ceil(barWidth), height);
    });
  },

  buildStripBackground: (params) => {
    const colors = (params.colors as string[]) ?? ['#ffffff', '#000000'];
    const stops = colors
      .map(
        (color, i) =>
          `${color} ${FLASH_STOP_SIZE * i}%, ${color} ${FLASH_STOP_SIZE * (i + 1)}%`,
      )
      .join(', ');
    return `repeating-linear-gradient(to right, ${stops})`;
  },
};
