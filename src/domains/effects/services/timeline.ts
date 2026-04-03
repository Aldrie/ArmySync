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
  excludeIds?: Set<string>,
): number {
  const thresholdTime = (SNAP_THRESHOLD_PX / containerWidth) * duration;
  let best = time;
  let bestDist = thresholdTime;

  for (const effect of effects) {
    if (effect.id === excludeId) continue;
    if (excludeIds?.has(effect.id)) continue;

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

/**
 * Resolve overlap after a move/resize by finding the nearest non-overlapping
 * position. Returns adjusted `{ from, to }` or `null` if already valid.
 */
export function resolveOverlap(
  effect: EffectInstance,
  allEffects: EffectInstance[],
  videoDuration: number,
  excludeIds?: Set<string>,
): { from: number; to: number } | null {
  const others = allEffects.filter(
    (e) => e.id !== effect.id && !excludeIds?.has(e.id),
  );
  const duration = effect.to - effect.from;

  const overlaps = others.some((o) => effect.from < o.to && effect.to > o.from);
  if (!overlaps) return null;

  const candidates: { from: number; to: number; dist: number }[] = [];
  const center = (effect.from + effect.to) / 2;

  for (const o of others) {
    const afterFrom = o.to;
    const afterTo = afterFrom + duration;
    if (afterTo <= videoDuration) {
      const afterCenter = (afterFrom + afterTo) / 2;
      candidates.push({
        from: afterFrom,
        to: afterTo,
        dist: Math.abs(afterCenter - center),
      });
    }

    const beforeTo = o.from;
    const beforeFrom = beforeTo - duration;
    if (beforeFrom >= 0) {
      const beforeCenter = (beforeFrom + beforeTo) / 2;
      candidates.push({
        from: beforeFrom,
        to: beforeTo,
        dist: Math.abs(beforeCenter - center),
      });
    }
  }

  candidates.push({
    from: 0,
    to: duration,
    dist: Math.abs(duration / 2 - center),
  });
  if (videoDuration - duration >= 0) {
    candidates.push({
      from: videoDuration - duration,
      to: videoDuration,
      dist: Math.abs(videoDuration - duration / 2 - center),
    });
  }

  const valid = candidates.filter(
    (c) => !others.some((o) => c.from < o.to && c.to > o.from),
  );

  if (valid.length === 0) return null;

  valid.sort((a, b) => a.dist - b.dist);
  return { from: valid[0].from, to: valid[0].to };
}
