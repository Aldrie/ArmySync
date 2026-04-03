import type { EffectInstance } from '../types';

const SNAP_THRESHOLD_PX = 6;

export function timeFromPixel(
  x: number,
  containerWidth: number,
  duration: number,
): number {
  return Math.max(0, Math.min(duration, (x / containerWidth) * duration));
}

export function pixelFromTime(
  time: number,
  containerWidth: number,
  duration: number,
): number {
  return (time / duration) * containerWidth;
}

export function findSnapTarget(
  time: number,
  effects: EffectInstance[],
  containerWidth: number,
  duration: number,
  excludeId?: string,
): number {
  const thresholdTime = (SNAP_THRESHOLD_PX / containerWidth) * duration;
  let best = time;
  let bestDist = thresholdTime;

  for (const effect of effects) {
    if (effect.id === excludeId) continue;

    const distFrom = Math.abs(time - effect.from);
    if (distFrom < bestDist) {
      bestDist = distFrom;
      best = effect.from;
    }

    const distTo = Math.abs(time - effect.to);
    if (distTo < bestDist) {
      bestDist = distTo;
      best = effect.to;
    }
  }

  return best;
}
