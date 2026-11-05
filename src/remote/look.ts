import { getEffectDefinition } from '../domains/effects';
import {
  BORAHAE,
  displayColor,
  isBorahae,
  type Pad,
  padToEffect,
} from '../domains/remote';
import { hexToRgb } from '../lib/color';

export const SIGNATURE_GLOW = '0 0 12px 1px rgba(165,92,255,.55)';

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const isBorahaePad = (pad: Pad) =>
  pad.kind === 'color' && isBorahae(pad.colors[0]);

export function glowOf(pad: Pad): string | null {
  if (pad.kind === 'blackout') return null;
  return isBorahae(pad.colors[0]) ? BORAHAE.glow : pad.colors[0];
}

export function edgeShadow(color: string | null): string {
  if (!color) return 'none';
  return `inset 0 0 0 4px ${color}, inset 0 0 18px 4px ${rgba(color, 0.85)}, inset 0 0 70px 14px ${rgba(color, 0.45)}`;
}

export function padBackground(pad: Pad): string {
  const { type, params } = padToEffect(
    { ...pad, colors: pad.colors.map(displayColor) },
    0,
    0,
    '',
  );
  return (
    getEffectDefinition(type)?.buildStripBackground(
      params,
      (8 * 60) / (pad.bpm ?? 120),
    ) ?? '#000000'
  );
}

export function padLook(pad: Pad, held: string[]) {
  const index = held.indexOf(pad.id);
  const isHeld = index >= 0;
  const active = isHeld && index === held.length - 1;
  const glow = glowOf(pad);
  const shadows = [
    active && glow ? `0 0 22px 2px ${rgba(glow, 0.5)}` : '',
    isBorahaePad(pad) ? SIGNATURE_GLOW : '',
  ].filter(Boolean);
  const blackout = pad.kind === 'blackout';

  return {
    order: index + 1,
    active,
    style: {
      transform: isHeld ? 'scale(1.05)' : '',
      zIndex: isHeld ? '1' : '',
      opacity: active || blackout ? '1' : isHeld ? '0.8' : '0.55',
      border: active
        ? '3px solid #ffffff'
        : blackout
          ? '1px dashed #4b444e'
          : '1px solid rgba(255,255,255,0.12)',
      boxShadow: shadows.join(', ') || 'none',
    },
  };
}

export function formatClock(seconds: number): string {
  const cs = Math.floor(Math.max(seconds, 0) * 100 + 1e-6);
  const s = Math.floor(cs / 100) % 60;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(cs / 6000)}:${pad2(s)}.${pad2(cs % 100)}`;
}
