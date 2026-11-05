import { type Pad, padToEffect } from './pads';
import { fadeDefinition } from '../effects/definitions/fade';
import { effectIdsInRange } from '../effects/services/timeline';
import type { EffectInstance } from '../effects/types';

const MIN_DURATION = 1 / 30;

export interface ActiveChange {
  padId: string | null;
  songTime: number;
}

export function effectsFromChanges(
  changes: ActiveChange[],
  endTime: number,
  pads: Pad[],
  newId: () => string,
): EffectInstance[] {
  const padsById = new Map(pads.map((pad) => [pad.id, pad]));
  const runs: { pad: Pad; from: number; to: number }[] = [];

  changes.forEach((change, i) => {
    const pad = change.padId === null ? undefined : padsById.get(change.padId);
    if (!pad) return;
    const to = changes[i + 1]?.songTime ?? endTime;
    const last = runs[runs.length - 1];
    if (last?.pad === pad && last.to === change.songTime) last.to = to;
    else runs.push({ pad, from: change.songTime, to });
  });

  return runs
    .filter((run) => run.to - run.from >= MIN_DURATION)
    .map((run) => padToEffect(run.pad, run.from, run.to, newId()));
}

function fadeColorAt(effect: EffectInstance, time: number): string {
  return fadeDefinition.handler({
    params: effect.params,
    duration: effect.to - effect.from,
    current: time - effect.from,
  });
}

function slice(effect: EffectInstance, from: number, to: number) {
  const params =
    effect.type === 'fade'
      ? {
          ...effect.params,
          startColor: fadeColorAt(effect, from),
          endColor: fadeColorAt(effect, to),
        }
      : effect.params;
  return { ...effect, from, to, params };
}

function cut(
  effect: EffectInstance,
  from: number,
  to: number,
  newId: () => string,
): EffectInstance[] {
  return [slice(effect, effect.from, from), slice(effect, to, effect.to)]
    .filter((part) => part.to - part.from >= MIN_DURATION)
    .map((part, i) => (i === 0 ? part : { ...part, id: newId() }));
}

export function applyTake(
  existing: EffectInstance[],
  incoming: EffectInstance[],
  newId: () => string,
): EffectInstance[] {
  let kept = existing;
  for (const effect of incoming) {
    const hit = new Set(effectIdsInRange(kept, effect.from, effect.to));
    kept = kept.flatMap((e) =>
      hit.has(e.id) ? cut(e, effect.from, effect.to, newId) : [e],
    );
  }
  return [...kept, ...incoming].sort((a, b) => a.from - b.from);
}
