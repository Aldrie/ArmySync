import { beforeEach, expect, it } from 'vitest';

import { createRemoteStore } from './store';
import type { MacToPhone, PhoneToMac, Profile } from '../domains/remote';

type Status = 'connecting' | 'open' | 'closed' | 'unauthorized';

let sent: PhoneToMac[];
let receive: (m: MacToPhone) => void;
let setStatus: (s: Status) => void;
let store: ReturnType<typeof createRemoteStore>;

const profile: Profile = {
  id: 'p1',
  projectId: 'proj',
  name: 'Default',
  pads: [{ id: 'red', kind: 'color', colors: ['#ff0000'] }],
};

const transport = (
  playing: boolean,
  songTime: number,
  agoMs = 0,
): MacToPhone => ({
  type: 'state',
  transport: { playing, songTime, serverTime: performance.now() - agoMs },
});

beforeEach(() => {
  sent = [];
  store = createRemoteStore((onMessage, onStatus) => {
    receive = onMessage;
    setStatus = onStatus;
    return { send: (m) => sent.push(m), close: () => {} };
  });
  store.getState().start();
  setStatus('open');
  receive({
    type: 'hello',
    projectId: 'proj',
    projectName: 'Song',
    projectNames: { proj: 'Song' },
    duration: 60,
    profiles: [profile],
    latencyMs: 0,
    effects: [],
    lastTakeStart: null,
  });
  receive(transport(false, 5));
});

const takes = () => sent.filter((m) => m.type === 'take');

it('auto-plays on a press while paused and records that pad from the take start', () => {
  store.getState().press('red');
  expect(sent).toContainEqual({ type: 'play', countdown: true });

  receive(transport(true, 5));
  receive(transport(false, 8));

  expect(takes()).toHaveLength(1);
  const [take] = takes();
  expect(take.type === 'take' && take.take.effects).toMatchObject([
    { type: 'color', from: 5, to: 8, params: { color: '#ff0000' } },
  ]);
});

it('keeps a take finished while disconnected and re-sends it on open', () => {
  store.getState().press('red');
  receive(transport(true, 5, 2000));
  setStatus('closed');

  expect(store.getState().outbox).toHaveLength(1);
  const takeId = store.getState().outbox[0].id;

  sent = [];
  setStatus('open');
  expect(takes()).toMatchObject([{ take: { id: takeId } }]);

  receive({ type: 'take-applied', takeId, lastTakeStart: 5 });
  expect(store.getState().outbox).toEqual([]);
  expect(store.getState().lastTakeStart).toBe(5);
});

it('does not send empty takes', () => {
  receive(transport(true, 5));
  receive(transport(false, 8));
  expect(takes()).toEqual([]);
});

const stateAt = (songTime: number, serverTime: number): MacToPhone => ({
  type: 'state',
  transport: { playing: true, songTime, serverTime },
});

const takeRanges = () =>
  takes().map((m) =>
    m.type === 'take' ? m.take.effects.map((e) => [e.from, e.to]) : [],
  );

it('keeps one take when a playing state only corrects drift', () => {
  store.getState().press('red');
  receive(stateAt(5, 1000));
  receive(stateAt(6.04, 2000));
  receive(transport(false, 8));
  expect(takeRanges()).toEqual([[[5, 8]]]);
});

it('splits the take when a playing state jumps', () => {
  store.getState().press('red');
  receive(stateAt(5, 1000));
  receive(stateAt(8, 2000));
  receive(transport(false, 10));
  expect(takeRanges()).toEqual([[[5, 6]], [[8, 10]]]);
});

it('collects calibration clicks per run and saves the latency', () => {
  receive({ type: 'calibration-click', serverTime: 100 });
  store.getState().calibrate('image');
  receive({ type: 'calibration-click', serverTime: 1000 });
  receive({ type: 'calibration-click', serverTime: 1600 });
  expect(store.getState().calibrationClicks).toEqual([1000, 1600]);
  expect(sent).toContainEqual({ type: 'calibrate', mode: 'image' });

  store.getState().saveLatency(42);
  expect(store.getState().latencyMs).toBe(42);
  expect(sent).toContainEqual({ type: 'latency-save', latencyMs: 42 });
});

it('records takes with the pads of the profile switched to', () => {
  const blue: Profile = {
    id: 'p2',
    projectId: 'proj',
    name: 'Blue',
    pads: [{ id: 'blue', kind: 'color', colors: ['#0000ff'] }],
  };
  store.getState().saveProfiles([profile, blue]);
  store.getState().setActiveProfile('p2');
  store.getState().press('blue');
  receive(transport(true, 5));
  receive(transport(false, 8));

  const [take] = takes();
  expect(take.type === 'take' && take.take.effects).toMatchObject([
    { params: { color: '#0000ff' } },
  ]);
});
