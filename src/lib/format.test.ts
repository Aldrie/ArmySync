import { expect, it } from 'vitest';

import { videoTime } from './format';

it('formats seconds as m:ss', () => {
  expect(videoTime(0)).toBe('0:00');
  expect(videoTime(75.9)).toBe('1:15');
});

it('pads minutes under an hour', () => {
  expect(videoTime(3725)).toBe('1:02:05');
});
