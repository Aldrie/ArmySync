import { expect, it } from 'vitest';

import { followPill } from './follow-pill';
import type { FollowState } from '../../stores/player-store';

const show = { id: 'p', name: 'Show', updatedAt: 0 };
const follow = (patch: Partial<FollowState> = {}): FollowState => ({
  sessionId: 's',
  deviceId: 'd',
  deviceName: 'TV',
  status: 'live',
  title: 'Video',
  itemId: 'item',
  versionMismatch: false,
  candidates: [show],
  chosen: false,
  ...patch,
});

it('puts a lost or idle TV before anything about the video', () => {
  expect(followPill(follow({ candidates: [], status: 'lost' }), true)).toBe(
    'Reconnecting',
  );
  expect(
    followPill(follow({ candidates: [show, show], status: 'idle' }), true),
  ).toBe('Nothing playing');
});

it('reports a known item without projects as having no light show', () => {
  expect(followPill(follow({ candidates: [] }), false)).toBe('No light show');
});

it('shows a pause before asking to pick', () => {
  expect(followPill(follow({ candidates: [show, show] }), false)).toBe(
    'Paused on TV',
  );
});

it('asks to pick when several projects match until one is chosen', () => {
  expect(followPill(follow({ candidates: [show, show] }), true)).toBe(
    'Pick a show',
  );
  expect(
    followPill(follow({ candidates: [show, show], chosen: true }), true),
  ).toBe('Following');
});

it('follows before the item is known', () => {
  expect(followPill(follow({ itemId: null, candidates: [] }), true)).toBe(
    'Following',
  );
});

it('tells paused from playing', () => {
  expect(followPill(follow(), false)).toBe('Paused on TV');
  expect(followPill(follow(), true)).toBe('Following');
});
