import { expect, it } from 'vitest';

import { heldPointers } from './held-pointers';

const setup = () => {
  const log: string[] = [];
  const pointers = heldPointers(
    (id) => log.push(`press ${id}`),
    (id) => log.push(`release ${id}`),
  );
  return { log, pointers };
};

it('tracks one pointer per pad and releases each pad once', () => {
  const { log, pointers } = setup();
  expect(pointers.down(1, 'a')).toBe(true);
  expect(pointers.down(2, 'a')).toBe(false);
  pointers.down(3, 'b');
  pointers.up(2);
  pointers.up(1);
  pointers.up(1);
  expect(log).toEqual(['press a', 'press b', 'release a']);
});

it('releases every held pad when the screen goes away', () => {
  const { log, pointers } = setup();
  pointers.down(1, 'a');
  pointers.down(2, 'b');
  pointers.releaseAll();
  pointers.up(1);
  pointers.releaseAll();
  expect(log).toEqual(['press a', 'press b', 'release a', 'release b']);
});
