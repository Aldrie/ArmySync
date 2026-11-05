import { expect, it } from 'vitest';

import { findSnapTarget } from './timeline';

it('snaps to extra points like the needle', () => {
  expect(findSnapTarget(10.05, [], 1000, 100, undefined, undefined, [10])).toBe(
    10,
  );
  expect(findSnapTarget(12, [], 1000, 100, undefined, undefined, [10])).toBe(
    12,
  );
});
