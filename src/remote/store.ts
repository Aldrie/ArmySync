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
  recording: { startTime: number; changes: ActiveChange[] } | null;
  outbox: Take[];
  countdownUntil: number | null;
  settings: RemoteSettings;
  start: () => void;
  press: (padId: string) => void;
  release: (padId: string) => void;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  nudge: (dt: number) => void;
  undoTake: () => void;
  saveProfiles: (profiles: Profile[]) => void;
  setMode: (m: Mode) => void;
  songNow: () => number;
}

type Open = (
  onMessage: (m: MacToPhone) => void,
  onStatus: (s: ConnectionStatus) => void,
) => Client;

const COUNTDOWN_MS = 3000;
const SEEK_JUMP_S = 0.25;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const activeOf = (held: string[]) => held[held.length - 1] ?? null;

export function createRemoteStore(open: Open) {
  let client: Client | null = null;
  let samples: { offset: number; rtt: number }[] = [];

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
              startTime,
              changes: [{ padId: activeOf(get().held), songTime: startTime }],
            },
          });

        const finishTake = (endTime: number) => {
          const { recording } = get();
          if (!recording) return;
          set({ recording: null });
          const effects = effectsFromChanges(
            recording.changes,
            endTime,
            pads(),
            createId,
          );
          if (!effects.length) return;
          const take = {
            id: createId(),
            startTime: recording.startTime,
            effects,
          };
          set({ outbox: [...get().outbox, take] });
          send({ type: 'take', take });
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
              changes: [...recording.changes, { padId: active, songTime }],
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
          if (transport.playing && !get().recording)
            openTake(transport.songTime);
        };

        const onHello = (m: Extract<MacToPhone, { type: 'hello' }>) => {
          const own = m.profiles.find((p) => p.projectId === m.projectId);
          const profile =
            own ?? defaultProfile(m.projectId, createId(), createId);
          set({
            project: { id: m.projectId, name: m.projectName },
            projectNames: m.projectNames,
            duration: m.duration,
            profiles: own ? m.profiles : [...m.profiles, profile],
            activeProfileId: profile.id,
            latencyMs: m.latencyMs,
            effects: m.effects,
            lastTakeStart: m.lastTakeStart,
          });
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
              set({ effects: m.effects });
              break;
            case 'take-applied':
              set({
                outbox: get().outbox.filter((t) => t.id !== m.takeId),
                lastTakeStart: m.lastTakeStart,
              });
              break;
            case 'take-undone':
              set({ lastTakeStart: m.lastTakeStart });
              break;
          }
        };

        const onStatus = (status: ConnectionStatus) => {
          set({ status });
          if (status === 'closed') finishTake(get().songNow());
          if (status === 'open')
            get().outbox.forEach((take) => send({ type: 'take', take }));
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
          undoTake: () => send({ type: 'undo-take' }),
          saveProfiles: (profiles) => {
            set({ profiles });
            send({ type: 'profiles-save', profiles });
          },
          setMode: (mode) => set({ mode }),
          songNow: () =>
            songTimeAt(get().transport, performance.now() + get().offsetMs),
        };
      },
      {
        name: 'armysync-remote',
        storage: createJSONStorage(() =>
          typeof localStorage === 'undefined' ? noopStorage : localStorage,
        ),
        partialize: (state) => ({ settings: state.settings }),
      },
    ),
  );
}

export const useRemoteStore = createRemoteStore((onMessage, onStatus) =>
  connect(socketUrl(window.location), onMessage, onStatus),
);
