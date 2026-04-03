import { hexToRgb, rgbToHex } from '../../../lib/color';
import { lerp } from '../../../lib/math';
import type { EffectDefinition } from '../types';

export const fadeDefinition: EffectDefinition = {
  type: 'fade',
  label: 'Color Fade',
  description: 'Smooth transition between two colors',
  icon: 'Blend',
  defaultDuration: 10,

  handler: ({ params, duration, current }) => {
    const startColor = hexToRgb((params.startColor as string) ?? '#ffffff');
    const endColor = hexToRgb((params.endColor as string) ?? '#000000');
    const t = duration > 0 ? current / duration : 0;

    const r = Math.round(lerp(startColor.r, endColor.r, t));
    const g = Math.round(lerp(startColor.g, endColor.g, t));
    const b = Math.round(lerp(startColor.b, endColor.b, t));

    return rgbToHex(r, g, b);
  },

  uiConfig: [
    {
      key: 'startColor',
      label: 'Start Color',
      type: 'color',
      default: '#ffffff',
    },
    {
      key: 'endColor',
      label: 'End Color',
      type: 'color',
      default: '#000000',
    },
  ],

  renderPreview: (ctx, width, height, params) => {
    const startColor = (params.startColor as string) ?? '#ffffff';
    const endColor = (params.endColor as string) ?? '#000000';

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  },

  buildStripBackground: (params) => {
    const startColor = (params.startColor as string) ?? '#ffffff';
    const endColor = (params.endColor as string) ?? '#000000';
    return `linear-gradient(to right, ${startColor}, ${endColor})`;
  },
};
