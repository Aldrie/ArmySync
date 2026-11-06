import { createId } from '@paralleldrive/cuid2';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import type { EffectInstance } from '../domains/effects/types';
import {
  type ActiveChange,
  clampLatency,
  defaultProfile,
  effectsFromChanges,
  type MacToPhone,
  type PhoneToMac,
  type Profile,
  type Take,
  type TransportSnapshot,
} from '../domains/remote';
import {
  bestOffset,
  type Client,
  connect,
  type ConnectionStatus,
  socketUrl,
  songTimeAt,
} from './net/client';

export type Mode = 'live' | 'timeline' | 'edit' | 'calibrate';

export interface RemoteSettings {
  autoplay: boolean;
  countdown: boolean;
  screenRadius: number;
}

export interface RemoteState {
  mode: Mode;
  status: ConnectionStatus;
  project: { id: string; name: string } | null;
  projectNames: Record<string, string>;
  profiles: Profile[];
  activeProfileId: string | null;
  transport: TransportSnapshot;
  duration: number;
  effects: EffectInstance[];
  latencyMs: number;
  lastTakeStart: number | null;
  offsetMs: number;
  held: string[];
  recording: {
    id: string;
    chunk: number;
    startTime: number;
    open: ActiveChange;
  } | null;
  outbox: { projectId: string; createdAt: number; take: Take }[];
  countdownUntil: number | null;
  settings: RemoteSettings;
  calibrationClicks: number[];
  calibrationBeat: number;
  notice: string | null;
  start: () => void;
  press: (padId: string) => void;
  release: (padId: string) => void;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  nudge: (dt: number) => void;
  undoTake: () => void;
  saveProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (id: string) => void;
  setMode: (m: Mode) => void;
  setSettings: (patch: Partial<RemoteSettings>) => void;
  calibrate: (mode: 'sound' | 'image') => void;
  saveLatency: (latencyMs: number) => void;
  songNow: () => number;
}

type Open = (
  onMessage: (m: MacToPhone) => void,
  onStatus: (s: ConnectionStatus) => void,
) => Client;

const COUNTDOWN_MS = 3000;
const SEEK_JUMP_S = 0.25;
const OUTBOX_TTL_MS = 24 * 60 * 60 * 1000;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const activeOf = (held: string[]) => held[held.length - 1] ?? null;

export function createRemoteStore(open: Open) {
  let client: Client | null = null;
  let samples: { offset: number; rtt: number }[] = [];
  let discarding = false;

  return create<RemoteState>()(
    persist(
      (set, get) => {
        const send = (m: PhoneToMac) => client?.send(m);

        const pads = () =>
          get().profiles.find((p) => p.id === get().activeProfileId)?.pads ??
          [];

        const openTake = (startTime: number) =>
          set({
            recording: {
              id: createId(),
              chunk: 0,
              startTime,
              open: { padId: activeOf(get().held), songTime: startTime },
            },
          });

        const sendRun = (
          recording: NonNullable<RemoteState['recording']>,
          endTime: number,
        ) => {
          const effects = effectsFromChanges(
            [recording.open],
            endTime,
            pads(),
            createId,
          );
          const project = get().project;
          if (!effects.length || !project) return recording.chunk;
          const take = {
            id: recording.id,
            chunk: recording.chunk,
            startTime: recording.startTime,
            effects,
          };
          set({
            outbox: [
              ...get().outbox,
              { projectId: project.id, createdAt: Date.now(), take },
            ],
          });
          send({ type: 'take', take });
          return recording.chunk + 1;
        };

        const finishTake = (endTime: number) => {
          const { recording } = get();
          if (!recording) return;
          set({ recording: null });
          sendRun(recording, endTime);
        };

        const setHeld = (held: string[]) => {
          const { recording, latencyMs } = get();
          const before = activeOf(get().held);
          set({ held });
          const active = activeOf(held);
          if (!recording || active === before) return;
          const songTime = Math.max(
            recording.startTime,
            get().songNow() - latencyMs / 1000,
          );
          set({
            recording: {
              ...recording,
              chunk: sendRun(recording, songTime),
              open: { padId: active, songTime },
            },
          });
        };

        const onTransport = (transport: TransportSnapshot) => {
          const old = get().transport;
          const expected = songTimeAt(old, transport.serverTime);
          const jumped =
            transport.playing &&
            Math.abs(transport.songTime - expected) > SEEK_JUMP_S;
          if (old.playing && (!transport.playing || jumped))
            finishTake(transport.playing ? expected : transport.songTime);
          set({
            transport,
            countdownUntil: transport.playing ? null : get().countdownUntil,
          });
          if (!transport.playing) discarding = false;
          if (transport.playing && !get().recording && !discarding)
            openTake(transport.songTime);
        };

        const onHello = (m: Extract<MacToPhone, { type: 'hello' }>) => {
          const own = m.profiles.find((p) => p.projectId === m.projectId);
          const profile =
            own ?? defaultProfile(m.projectId, createId(), createId);
          const keep = m.profiles.find(
            (p) =>
              p.id === get().activeProfileId && p.projectId === m.projectId,
          );
          set({
            project: { id: m.projectId, name: m.projectName },
            projectNames: m.projectNames,
            duration: m.duration,
            profiles: own ? m.profiles : [...m.profiles, profile],
            activeProfileId: (keep ?? profile).id,
            latencyMs: clampLatency(m.latencyMs),
            effects: m.effects,
            lastTakeStart: m.lastTakeStart,
            outbox: get().outbox.filter(
              (entry) => Date.now() - entry.createdAt < OUTBOX_TTL_MS,
            ),
          });
          get()
            .outbox.filter((entry) => entry.projectId === m.projectId)
            .forEach(({ take }) => send({ type: 'take', take }));
        };

        const onMessage = (m: MacToPhone) => {
          switch (m.type) {
            case 'pong': {
              const t1 = performance.now();
              samples = [
                ...samples.slice(-9),
                { offset: m.serverTime - (m.t0 + t1) / 2, rtt: t1 - m.t0 },
              ];
              set({ offsetMs: bestOffset(samples) });
              break;
            }
            case 'state':
              onTransport(m.transport);
              break;
            case 'hello':
              onHello(m);
              break;
            case 'effects':
              set({ effects: m.effects, lastTakeStart: m.lastTakeStart });
              break;
            case 'take-applied':
              set({
                outbox: get().outbox.filter(
                  ({ take }) => take.id !== m.takeId || take.chunk !== m.chunk,
                ),
                lastTakeStart: m.lastTakeStart,
              });
              break;
            case 'take-undone':
              set({ lastTakeStart: m.lastTakeStart });
              break;
            case 'calibration-click':
              set({
                calibrationBeat: m.beat,
                calibrationClicks: m.warmup
                  ? get().calibrationClicks
                  : [...get().calibrationClicks, m.serverTime],
              });
              break;
            case 'error':
              if (m.message !== 'unauthorized') set({ notice: m.message });
              break;
          }
        };

        const onStatus = (status: ConnectionStatus) => {
          set({ status });
          if (status === 'closed') {
            discarding = false;
            finishTake(get().songNow());
          }
        };

        return {
          mode: 'live',
          status: 'connecting',
          project: null,
          projectNames: {},
          profiles: [],
          activeProfileId: null,
          transport: { playing: false, songTime: 0, serverTime: 0 },
          duration: 0,
          effects: [],
          latencyMs: 0,
          lastTakeStart: null,
          offsetMs: 0,
          held: [],
          recording: null,
          outbox: [],
          countdownUntil: null,
          settings: { autoplay: true, countdown: true, screenRadius: 36 },
          calibrationClicks: [],
          calibrationBeat: -1,
          notice: null,

          start: () => {
            client ??= open(onMessage, onStatus);
          },
          press: (padId) => {
            const { transport, countdownUntil, settings } = get();
            setHeld([...get().held.filter((id) => id !== padId), padId]);
            if (
              !transport.playing &&
              countdownUntil === null &&
              settings.autoplay
            )
              get().play();
          },
          release: (padId) => setHeld(get().held.filter((id) => id !== padId)),
          play: () => {
            const { countdown } = get().settings;
            send({ type: 'play', countdown });
            if (countdown) set({ countdownUntil: Date.now() + COUNTDOWN_MS });
          },
          pause: () => {
            set({ countdownUntil: null });
            send({ type: 'pause' });
          },
          seek: (t) =>
            send({
              type: 'seek',
              time: Math.min(Math.max(t, 0), get().duration),
            }),
          nudge: (dt) => get().seek(get().songNow() + dt),
          undoTake: () => {
            const { recording } = get();
            if (!recording) return send({ type: 'undo-take' });
            discarding = true;
            set({
              recording: null,
              outbox: get().outbox.filter(
                ({ take }) => take.id !== recording.id,
              ),
            });
            get().pause();
            if (recording.chunk > 0) send({ type: 'undo-take' });
            else get().seek(recording.startTime);
          },
          saveProfiles: (profiles) => {
            set({ profiles });
            send({ type: 'profiles-save', profiles });
          },
          setActiveProfile: (activeProfileId) => set({ activeProfileId }),
          setMode: (mode) => set({ mode }),
          setSettings: (patch) =>
            set({ settings: { ...get().settings, ...patch } }),
          calibrate: (mode) => {
            set({ calibrationClicks: [], calibrationBeat: -1 });
            send({ type: 'calibrate', mode });
          },
          saveLatency: (ms) => {
            const latencyMs = clampLatency(ms);
            set({ latencyMs });
            send({ type: 'latency-save', latencyMs });
          },
          songNow: () =>
            songTimeAt(get().transport, performance.now() + get().offsetMs),
        };
      },
      {
        name: 'armysync-remote',
        storage: createJSONStorage(() =>
          typeof localStorage === 'undefined' ? noopStorage : localStorage,
        ),
        partialize: (state) => ({
          settings: state.settings,
          outbox: state.outbox,
        }),
      },
    ),
  );
}

export const useRemoteStore = createRemoteStore((onMessage, onStatus) =>
  connect(socketUrl(window.location), onMessage, onStatus),
);
