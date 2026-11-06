import { describe, expect, it } from 'vitest';

import type { Pad } from './pads';
import { applyTake, dedupeTakes, effectsFromChanges } from './take';
import { hexToRgb } from '../../lib/color';
import type { EffectInstance } from '../effects/types';

function counter() {
  let n = 0;
  return () => `id-${++n}`;
}

const pads: Pad[] = [
  { id: 'A', kind: 'color', colors: ['#ff0000'] },
  { id: 'B', kind: 'color', colors: ['#00ff00'] },
];

function spans(effects: EffectInstance[]) {
  return effects.map((e) => [e.params.color ?? e.type, e.from, e.to]);
}

function color(id: string, from: number, to: number): EffectInstance {
  return { id, type: 'color', from, to, params: { color: '#ffffff' } };
}

describe('effectsFromChanges', () => {
  it('turns changes into runs', () => {
    const effects = effectsFromChanges(
      [
        { padId: 'A', songTime: 1 },
        { padId: 'B', songTime: 2 },
        { padId: 'A', songTime: 3 },
        { padId: null, songTime: 4 },
      ],
      10,
      pads,
      counter(),
    );
    expect(spans(effects)).toEqual([
      ['#ff0000', 1, 2],
      ['#00ff00', 2, 3],
      ['#ff0000', 3, 4],
    ]);
    expect(effects.map((e) => e.id)).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('drops runs shorter than a frame', () => {
    const changes = [
      { padId: 'A', songTime: 1 },
      { padId: null, songTime: 1.01 },
    ];
    expect(effectsFromChanges(changes, 10, pads, counter())).toEqual([]);
  });

  it('closes an open run at endTime', () => {
    const changes = [{ padId: 'A', songTime: 1 }];
    expect(spans(effectsFromChanges(changes, 5, pads, counter()))).toEqual([
      ['#ff0000', 1, 5],
    ]);
  });

  it('merges consecutive runs of the same pad', () => {
    const changes = [
      { padId: 'A', songTime: 1 },
      { padId: 'A', songTime: 2 },
      { padId: null, songTime: 3 },
    ];
    expect(spans(effectsFromChanges(changes, 5, pads, counter()))).toEqual([
      ['#ff0000', 1, 3],
    ]);
  });

  it('drops unknown pads', () => {
    const changes = [
      { padId: 'Z', songTime: 1 },
      { padId: 'A', songTime: 2 },
    ];
    expect(spans(effectsFromChanges(changes, 5, pads, counter()))).toEqual([
      ['#ff0000', 2, 5],
    ]);
  });
});

describe('applyTake', () => {
  it('cuts an overlapped effect around the incoming one', () => {
    const incoming = color('in', 4, 6);
    const result = applyTake([color('old', 0, 10)], [incoming], counter());
    expect(result.map((e) => [e.id, e.from, e.to])).toEqual([
      ['old', 0, 4],
      ['in', 4, 6],
      ['id-1', 6, 10],
    ]);
  });

  it('recolors fade remainders at the cut', () => {
    const fade: EffectInstance = {
      id: 'f',
      type: 'fade',
      from: 0,
      to: 10,
      params: { startColor: '#000000', endColor: '#ffffff' },
    };
    const result = applyTake([fade], [color('in', 0, 5)], counter());
    const rest = result.find((e) => e.type === 'fade');
    expect(rest).toMatchObject({ from: 5, to: 10 });
    expect(rest?.params.endColor).toBe('#ffffff');
    const start = hexToRgb(rest?.params.startColor as string);
    for (const channel of [start.r, start.g, start.b]) {
      expect(Math.abs(channel - 0x80)).toBeLessThanOrEqual(1);
    }
  });

  it('keeps flash params on remainders', () => {
    const flash: EffectInstance = {
      id: 'f',
      type: 'flash',
      from: 0,
      to: 10,
      params: { colors: ['#fff', '#000'], bpm: 120 },
    };
    const result = applyTake([flash], [color('in', 4, 6)], counter());
    const rests = result.filter((e) => e.type === 'flash');
    expect(rests).toHaveLength(2);
    for (const r of rests) expect(r.params).toEqual(flash.params);
  });

  it('leaves adjacent effects untouched', () => {
    const old = color('old', 0, 10);
    const incoming = color('in', 10, 12);
    expect(applyTake([old], [incoming], counter())).toEqual([old, incoming]);
  });

  it('replaces a fully covered effect', () => {
    const incoming = color('in', 0, 10);
    expect(applyTake([color('old', 0, 10)], [incoming], counter())).toEqual([
      incoming,
    ]);
  });

  it('drops remainders shorter than a frame', () => {
    const result = applyTake(
      [color('old', 0, 10)],
      [color('in', 0.01, 10)],
      counter(),
    );
    expect(result.map((e) => e.id)).toEqual(['in']);
  });
});

describe('dedupeTakes', () => {
  const chunk = (id: string, n: number) => ({
    id,
    chunk: n,
    startTime: 0,
    effects: [],
  });

  it('applies each chunk once and still reports a repeat as applied', () => {
    const seen: string[] = [];
    const apply = dedupeTakes((t) => {
      seen.push(`${t.id}:${t.chunk}`);
      return true;
    });
    expect(apply(chunk('a', 0))).toBe(true);
    expect(apply(chunk('a', 0))).toBe(true);
    expect(apply(chunk('a', 1))).toBe(true);
    expect(apply(chunk('b', 0))).toBe(true);
    expect(seen).toEqual(['a:0', 'a:1', 'b:0']);
  });

  it('retries a chunk that failed to apply', () => {
    let ok = false;
    const apply = dedupeTakes(() => ok);
    expect(apply(chunk('a', 0))).toBe(false);
    ok = true;
    expect(apply(chunk('a', 0))).toBe(true);
  });
});
