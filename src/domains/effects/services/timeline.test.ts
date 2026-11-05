import { expect, it } from 'vitest';

import { effectIdsInRange, findSnapTarget } from './timeline';

it('snaps to extra points like the needle', () => {
  expect(findSnapTarget(10.05, [], 1000, 100, undefined, undefined, [10])).toBe(
    10,
  );
  expect(findSnapTarget(12, [], 1000, 100, undefined, undefined, [10])).toBe(
    12,
  );
});

it('finds effects touching a time range', () => {
  const effects = [
    { id: 'a', type: 'color', from: 0, to: 2, params: {} },
    { id: 'b', type: 'color', from: 3, to: 5, params: {} },
    { id: 'c', type: 'color', from: 6, to: 8, params: {} },
  ];
  expect(effectIdsInRange(effects, 1, 4)).toEqual(['a', 'b']);
  expect(effectIdsInRange(effects, 2, 3)).toEqual([]);
});
