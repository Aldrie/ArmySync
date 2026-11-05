import { expect, it } from 'vitest';

import { parsePhoneMessage } from './protocol';

const known = new Set(['color', 'fade']);

function take(effect: Record<string, unknown>) {
  return JSON.stringify({
    type: 'take',
    take: { id: 't', startTime: 0, effects: [effect] },
  });
}

it('parses a valid seek', () => {
  expect(parsePhoneMessage('{"type":"seek","time":12.5}', known)).toEqual({
    type: 'seek',
    time: 12.5,
  });
});

it('parses a valid take', () => {
  const effect = { id: 'e', type: 'color', from: 1, to: 2, params: {} };
  expect(parsePhoneMessage(take(effect), known)).toEqual({
    type: 'take',
    take: { id: 't', startTime: 0, effects: [effect] },
  });
});

it('parses profiles-save', () => {
  const profiles = [
    {
      id: 'p',
      projectId: 'x',
      name: 'Default',
      pads: [{ id: 'a', kind: 'strobe', colors: ['#fff', '#000'], bpm: 180 }],
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
  [
    'unknown effect type',
    take({ id: 'e', type: 'laser', from: 1, to: 2, params: {} }),
  ],
  ['from >= to', take({ id: 'e', type: 'color', from: 2, to: 2, params: {} })],
  ['non-object params', take({ id: 'e', type: 'color', from: 1, to: 2 })],
  [
    'unknown pad kind',
    JSON.stringify({
      type: 'profiles-save',
      profiles: [
        {
          id: 'p',
          projectId: 'x',
          name: 'n',
          pads: [{ id: 'a', kind: 'laser', colors: [] }],
        },
      ],
    }),
  ],
])('rejects %s', (_, raw) => {
  expect(parsePhoneMessage(raw, known)).toBeNull();
});
