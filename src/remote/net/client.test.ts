import { describe, expect, it } from 'vitest';

import { bestOffset, songTimeAt } from './client';

describe('bestOffset', () => {
  it('picks the offset with the lowest rtt among the last 10 samples', () => {
    const samples = [
      { offset: 999, rtt: 1 },
      ...Array.from({ length: 10 }, (_, i) => ({ offset: i, rtt: 50 - i })),
    ];
    samples[5] = { offset: 42, rtt: 2 };
    expect(bestOffset(samples)).toBe(42);
  });

  it('is 0 without samples', () => {
    expect(bestOffset([])).toBe(0);
  });
});

describe('songTimeAt', () => {
  it('advances with the server clock while playing', () => {
    expect(
      songTimeAt({ playing: true, songTime: 10, serverTime: 1000 }, 3500),
    ).toBe(12.5);
  });

  it('stays put while paused', () => {
    expect(
      songTimeAt({ playing: false, songTime: 10, serverTime: 1000 }, 3500),
    ).toBe(10);
  });
});
