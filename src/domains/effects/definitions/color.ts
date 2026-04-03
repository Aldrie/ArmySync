import type { EffectDefinition } from '../types';

export const colorDefinition: EffectDefinition = {
  type: 'color',
  label: 'Static Color',
  description: 'A single solid color for the entire duration',
  defaultDuration: 2,

  handler: ({ params }) => {
    return (params.color as string) ?? '#ffffff';
  },

  uiConfig: [
    { key: 'color', label: 'Color', type: 'color', default: '#ffffff' },
  ],

  renderPreview: (ctx, width, height, params) => {
    ctx.fillStyle = (params.color as string) ?? '#ffffff';
    ctx.fillRect(0, 0, width, height);
  },

  buildStripBackground: (params) => {
    return (params.color as string) ?? '#ffffff';
  },
};
