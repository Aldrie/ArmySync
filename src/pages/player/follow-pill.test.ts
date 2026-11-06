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
  ...patch,
});

it('reports a known item without projects as having no light show', () => {
  expect(followPill(follow({ candidates: [], status: 'lost' }), true)).toBe(
    'No light show',
  );
});

it('asks to pick when several projects match', () => {
  expect(followPill(follow({ candidates: [show, show] }), false)).toBe(
    'Pick a show',
  );
});

it('falls back to the session status before the item is known', () => {
  expect(followPill(follow({ itemId: null, candidates: [] }), true)).toBe(
    'Following',
  );
  expect(followPill(follow({ status: 'idle' }), true)).toBe('Nothing playing');
  expect(followPill(follow({ status: 'lost' }), true)).toBe('Reconnecting');
});

it('tells paused from playing', () => {
  expect(followPill(follow(), false)).toBe('Paused on TV');
  expect(followPill(follow(), true)).toBe('Following');
});
