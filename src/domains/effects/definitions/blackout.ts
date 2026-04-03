import type { EffectDefinition } from '../types';

export const blackoutDefinition: EffectDefinition = {
  type: 'blackout',
  label: 'Blackout',
  description: 'Turn off the lightstick completely',
  icon: 'EyeOff',
  defaultDuration: 5,

  handler: () => '#000000',

  uiConfig: [],

  renderPreview: (ctx, width, height) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  },

  buildStripBackground: () => '#000000',
};
