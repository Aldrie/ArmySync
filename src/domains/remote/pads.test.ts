import { describe, expect, it } from 'vitest';

import {
  BORAHAE,
  defaultProfile,
  displayColor,
  idleBlackoutOf,
  isBorahae,
  type Pad,
  padToEffect,
} from './pads';

function counter() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('colors', () => {
  it('shows Borahae as its display purple', () => {
    expect(displayColor('#3F00FF')).toBe('#8b2cf5');
    expect(displayColor('#ff0000')).toBe('#ff0000');
    expect(isBorahae('#3f00ff')).toBe(true);
    expect(isBorahae('#3f00fe')).toBe(false);
  });
});

describe('idleBlackoutOf', () => {
  it('defaults to on', () => {
    const profile = defaultProfile('x', 'p', counter());
    expect(profile.idleBlackout).toBe(true);
    expect(idleBlackoutOf({ ...profile, idleBlackout: undefined })).toBe(true);
    expect(idleBlackoutOf({ ...profile, idleBlackout: false })).toBe(false);
  });
});

describe('padToEffect', () => {
  it('maps a color pad', () => {
    const pad: Pad = { id: 'p', kind: 'color', colors: ['#ff0000'] };
    expect(padToEffect(pad, 1, 2, 'e')).toEqual({
      id: 'e',
      type: 'color',
      from: 1,
      to: 2,
      params: { color: '#ff0000' },
    });
  });

  it('maps a strobe pad to flash', () => {
    const pad: Pad = {
      id: 'p',
      kind: 'strobe',
      colors: ['#b45cff', '#ffffff'],
      bpm: 180,
    };
    expect(padToEffect(pad, 1, 2, 'e')).toEqual({
      id: 'e',
      type: 'flash',
      from: 1,
      to: 2,
      params: { colors: ['#b45cff', '#ffffff'], bpm: 180 },
    });
  });

  it('maps a fade pad', () => {
    const pad: Pad = { id: 'p', kind: 'fade', colors: ['#4d7bff', '#b45cff'] };
    expect(padToEffect(pad, 1, 2, 'e')).toEqual({
      id: 'e',
      type: 'fade',
      from: 1,
      to: 2,
      params: { startColor: '#4d7bff', endColor: '#b45cff' },
    });
  });

  it('maps a blackout pad', () => {
    const pad: Pad = { id: 'p', kind: 'blackout', colors: [] };
    expect(padToEffect(pad, 1, 2, 'e')).toEqual({
      id: 'e',
      type: 'blackout',
      from: 1,
      to: 2,
      params: {},
    });
  });
});

describe('defaultProfile', () => {
  it('has 8 pads starting with Borahae', () => {
    const profile = defaultProfile('proj', 'prof', counter());
    expect(profile).toMatchObject({
      id: 'prof',
      projectId: 'proj',
      name: 'Default',
    });
    expect(profile.pads).toHaveLength(8);
    expect(profile.pads[0]).toEqual({
      id: 'id-1',
      kind: 'color',
      colors: [BORAHAE.command],
    });
    expect(profile.pads.map((p) => p.kind)).toEqual([
      'color',
      'color',
      'color',
      'color',
      'color',
      'strobe',
      'fade',
      'blackout',
    ]);
    expect(profile.pads[5]).toMatchObject({
      colors: ['#b45cff', '#ffffff'],
      bpm: 180,
    });
    expect(new Set(profile.pads.map((p) => p.id)).size).toBe(8);
  });
});
