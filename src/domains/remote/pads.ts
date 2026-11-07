import type { EffectInstance } from '../effects/types';

export const BORAHAE = {
  command: '#3f00ff',
  display: '#8b2cf5',
  glow: '#a55cff',
} as const;

export type PadKind = 'color' | 'strobe' | 'fade' | 'blackout';

export interface Pad {
  id: string;
  kind: PadKind;
  colors: string[];
  bpm?: number;
}

export interface Profile {
  id: string;
  projectId: string;
  name: string;
  pads: Pad[];
  idleBlackout?: boolean;
}

export function idleBlackoutOf(profile: Profile): boolean {
  return profile.idleBlackout ?? true;
}

export const PAD_SWATCHES: string[] = [
  '#3f00ff',
  '#ff4d5e',
  '#ff8a3d',
  '#ffc44d',
  '#3ddc84',
  '#4dd8ff',
  '#4d7bff',
  '#ff6bd6',
  '#ffffff',
];

export function isBorahae(hex: string): boolean {
  return hex.toLowerCase() === BORAHAE.command;
}

export function displayColor(hex: string): string {
  return isBorahae(hex) ? BORAHAE.display : hex;
}

export function defaultProfile(
  projectId: string,
  id: string,
  padId: () => string,
): Profile {
  const color = (hex: string): Pad => ({
    id: padId(),
    kind: 'color',
    colors: [hex],
  });
  return {
    id,
    projectId,
    name: 'Default',
    pads: [
      color(BORAHAE.command),
      color('#ffffff'),
      color('#ff4d5e'),
      color('#4d7bff'),
      color('#3ddc84'),
      { id: padId(), kind: 'strobe', colors: ['#b45cff', '#ffffff'], bpm: 180 },
      { id: padId(), kind: 'fade', colors: ['#4d7bff', '#b45cff'] },
      { id: padId(), kind: 'blackout', colors: [] },
    ],
    idleBlackout: true,
  };
}

const padsKey = (pads: Pad[]) =>
  JSON.stringify(pads.map(({ kind, colors, bpm }) => [kind, colors, bpm]));

export function isUntouchedDefault(profile: Profile): boolean {
  const fresh = defaultProfile(profile.projectId, profile.id, () => '');
  return (
    profile.name === fresh.name &&
    idleBlackoutOf(profile) === idleBlackoutOf(fresh) &&
    padsKey(profile.pads) === padsKey(fresh.pads)
  );
}

function effectOf(pad: Pad): Pick<EffectInstance, 'type' | 'params'> {
  switch (pad.kind) {
    case 'color':
      return { type: 'color', params: { color: pad.colors[0] } };
    case 'strobe':
      return {
        type: 'flash',
        params: { colors: [...pad.colors], bpm: pad.bpm },
      };
    case 'fade':
      return {
        type: 'fade',
        params: { startColor: pad.colors[0], endColor: pad.colors[1] },
      };
    case 'blackout':
      return { type: 'blackout', params: {} };
  }
}

export function padToEffect(
  pad: Pad,
  from: number,
  to: number,
  id: string,
): EffectInstance {
  return { id, from, to, ...effectOf(pad) };
}
