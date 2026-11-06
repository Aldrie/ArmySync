import { expect, it } from 'vitest';

import { parsePhoneMessage } from './protocol';

const known = new Set(['color', 'fade', 'flash', 'blackout']);

function take(
  effect: Record<string, unknown>,
  fields: Record<string, unknown> = { chunk: 0 },
) {
  return JSON.stringify({
    type: 'take',
    take: { id: 't', startTime: 0, ...fields, effects: [effect] },
  });
}

const red = {
  id: 'e',
  type: 'color',
  from: 1,
  to: 2,
  params: { color: '#ff0000' },
};

function effect(type: string, params: unknown, from = 1, to = 2) {
  return take({ id: 'e', type, from, to, params });
}

function profilesSave(pad: Record<string, unknown>) {
  return JSON.stringify({
    type: 'profiles-save',
    profiles: [{ id: 'p', projectId: 'x', name: 'n', pads: [pad] }],
  });
}

it('parses a valid seek', () => {
  expect(parsePhoneMessage('{"type":"seek","time":12.5}', known)).toEqual({
    type: 'seek',
    time: 12.5,
  });
});

it('parses a valid take', () => {
  const effects = [
    { id: 'a', type: 'color', from: 1, to: 2, params: { color: '#FF0000' } },
    {
      id: 'b',
      type: 'fade',
      from: 2,
      to: 3,
      params: { startColor: '#000000', endColor: '#ffffff' },
    },
    {
      id: 'c',
      type: 'flash',
      from: 3,
      to: 4,
      params: { colors: ['#ffffff', '#000000'], bpm: 120 },
    },
    { id: 'd', type: 'blackout', from: 4, to: 5, params: {} },
  ];
  const raw = JSON.stringify({
    type: 'take',
    take: { id: 't', chunk: 3, startTime: 0, effects },
  });
  expect(parsePhoneMessage(raw, known)).toEqual({
    type: 'take',
    take: { id: 't', chunk: 3, startTime: 0, effects },
  });
});

it('parses profiles-save', () => {
  const profiles = [
    {
      id: 'p',
      projectId: 'x',
      name: 'Default',
      pads: [
        { id: 'a', kind: 'color', colors: ['#3f00ff'] },
        { id: 'b', kind: 'strobe', colors: ['#ffffff', '#000000'], bpm: 180 },
        { id: 'c', kind: 'fade', colors: ['#4d7bff', '#b45cff'] },
        { id: 'd', kind: 'blackout', colors: [] },
      ],
    },
  ];
  expect(
    parsePhoneMessage(
      JSON.stringify({ type: 'profiles-save', profiles }),
      known,
    ),
  ).toEqual({ type: 'profiles-save', profiles });
});

it.each([
  ['missing field', '{"type":"seek"}'],
  ['bad json', '{"type":'],
  ['non-object', '42'],
  ['unknown type', '{"type":"explode"}'],
  ['unknown effect type', effect('laser', {})],
  ['take without chunk', take(red, {})],
  ['negative chunk', take(red, { chunk: -1 })],
  ['fractional chunk', take(red, { chunk: 1.5 })],
  ['from >= to', effect('color', { color: '#ffffff' }, 2, 2)],
  ['non-object params', effect('color', undefined)],
  ['color without hex', effect('color', { color: 'red' })],
  [
    'fade with numeric startColor',
    effect('fade', { startColor: 42, endColor: '#ffffff' }),
  ],
  [
    'fade with empty startColor',
    effect('fade', { startColor: '', endColor: '#ffffff' }),
  ],
  ['flash with bad color', effect('flash', { colors: ['#ffffff', '#fff'] })],
  ['flash without colors', effect('flash', { colors: [] })],
  ['flash with bad bpm', effect('flash', { colors: ['#ffffff'], bpm: 'fast' })],
  ['unknown pad kind', profilesSave({ id: 'a', kind: 'laser', colors: [] })],
  [
    'color pad without color',
    profilesSave({ id: 'a', kind: 'color', colors: [] }),
  ],
  [
    'color pad with non-hex',
    profilesSave({ id: 'a', kind: 'color', colors: ['banana'] }),
  ],
  [
    'fade pad with one color',
    profilesSave({ id: 'a', kind: 'fade', colors: ['#ffffff'] }),
  ],
  [
    'blackout pad with a color',
    profilesSave({ id: 'a', kind: 'blackout', colors: ['#ffffff'] }),
  ],
  [
    'strobe pad with bad bpm',
    profilesSave({
      id: 'a',
      kind: 'strobe',
      colors: ['#ffffff', '#000000'],
      bpm: null,
    }),
  ],
])('rejects %s', (_, raw) => {
  expect(parsePhoneMessage(raw, known)).toBeNull();
});
