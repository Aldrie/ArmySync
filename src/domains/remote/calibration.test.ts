import { expect, it } from 'vitest';

import { computeLatency } from './calibration';

const clicks = Array.from({ length: 16 }, (_, i) => 1000 + i * 600);
const jitter = [5, -5, 3, -3, 0, 2, -2, 4, -4, 1, -1, 5, -5, 0, 3, -3];
const taps = clicks.map((c, i) => c + 42 + jitter[i]);

it('measures the median tap delay', () => {
  const result = computeLatency(clicks, taps);
  expect(result?.count).toBe(16);
  expect(result?.latencyMs).toBeGreaterThanOrEqual(39);
  expect(result?.latencyMs).toBeLessThanOrEqual(45);
  expect(result?.spreadMs).toBeLessThanOrEqual(5);
});

it('needs at least 4 pairs', () => {
  expect(computeLatency(clicks, taps.slice(0, 3))).toBeNull();
});

it('ignores a tap half an interval off', () => {
  const result = computeLatency(clicks, [...taps, clicks[3] + 300]);
  expect(result?.count).toBe(16);
});
