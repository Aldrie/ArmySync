import { createId } from '@paralleldrive/cuid2';
import { useEffect } from 'react';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { getAllEffectDefinitions } from '../../../domains/effects';
import { listProjects } from '../../../domains/project';
import {
  clampLatency,
  dedupeTakes,
  defaultProfile,
  parsePhoneMessage,
} from '../../../domains/remote';
import type { MacToPhone, PhoneToMac, Profile } from '../../../domains/remote';
import { loadSettings, updateSettings } from '../../../lib/settings';
import { editorRefs } from '../../../stores/editor-refs';
import { useEditorStore } from '../../../stores/editor-store';

const COUNTDOWN_MS = 3000;
const EFFECTS_DEBOUNCE_MS = 300;
const PROFILES = 'remote-profiles';

const store = useEditorStore.getState;

const send = (message: MacToPhone) =>
  invoke('remote_send', { message }).catch((e: unknown) =>
    console.error('Failed to reach the phone:', e),
  );

const writeProfiles = (profiles: Profile[]) =>
  invoke('write_app_json', { name: PROFILES, value: profiles });

async function sendHello() {
  const project = store().project;
  if (!project) return;
  const [stored, projects, settings] = await Promise.all([
    invoke<Profile[] | null>('read_app_json', { name: PROFILES }),
    listProjects(),
    loadSettings(),
  ]);
  let profiles = stored ?? [];
  if (!profiles.some((p) => p.projectId === project.id)) {
    profiles = [...profiles, defaultProfile(project.id, createId(), createId)];
    await writeProfiles(profiles);
  }
  const { effects, videoDuration, lastTakeStart } = store();
  await send({
    type: 'hello',
    projectId: project.id,
    projectName: project.name,
    projectNames: Object.fromEntries(projects.map((p) => [p.id, p.name])),
    duration: videoDuration,
    profiles,
    latencyMs: settings.remoteLatencyMs,
    effects,
    lastTakeStart: lastTakeStart(),
  });
}

export function useRemoteHub() {
  useEffect(() => {
    const knownTypes = new Set(getAllEffectDefinitions().map((d) => d.type));
    // The phone re-sends chunks whose ack it missed; re-applying one would overwrite edits made since.
    const applyTake = dedupeTakes((take) => store().applyRemoteTake(take));
    let connected = false;
    let countdown: ReturnType<typeof setTimeout> | undefined;
    let effectsTimer: ReturnType<typeof setTimeout> | undefined;

    const onMessage = (message: PhoneToMac) => {
      switch (message.type) {
        case 'play':
          clearTimeout(countdown);
          if (message.countdown) {
            countdown = setTimeout(() => store().play(), COUNTDOWN_MS);
          } else {
            store().play();
          }
          break;
        case 'pause':
          clearTimeout(countdown);
          store().pause();
          break;
        case 'seek':
          store().seek(message.time);
          break;
        case 'take': {
          const { take } = message;
          void send(
            applyTake(take)
              ? {
                  type: 'take-applied',
                  takeId: take.id,
                  chunk: take.chunk,
                  lastTakeStart: store().lastTakeStart(),
                }
              : { type: 'error', message: 'No project is open on the Mac.' },
          );
          break;
        }
        case 'undo-take':
          void send(
            store().undoRemoteTake() === null
              ? {
                  type: 'error',
                  message: 'Nothing to undo: the last edit is not a take.',
                }
              : { type: 'take-undone', lastTakeStart: store().lastTakeStart() },
          );
          break;
        case 'profiles-save':
          writeProfiles(message.profiles).catch((e: unknown) =>
            console.error('Failed to save remote profiles:', e),
          );
          break;
        case 'latency-save':
          void updateSettings({
            remoteLatencyMs: clampLatency(message.latencyMs),
          });
          break;
      }
    };

    const unlistenStatus = listen<{ connected: boolean }>(
      'remote-status',
      (event) => {
        connected = event.payload.connected;
        if (connected) {
          sendHello().catch((e: unknown) =>
            console.error('Failed to greet the phone:', e),
          );
        }
      },
    );

    const unlistenMessage = listen<unknown>('remote-message', (event) => {
      const message = parsePhoneMessage(
        JSON.stringify(event.payload),
        knownTypes,
      );
      if (message) onMessage(message);
    });

    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (!connected || state.effects === prev.effects) return;
      clearTimeout(effectsTimer);
      effectsTimer = setTimeout(
        () =>
          void send({
            type: 'effects',
            effects: store().effects,
            lastTakeStart: store().lastTakeStart(),
          }),
        EFFECTS_DEBOUNCE_MS,
      );
    });

    return () => {
      clearTimeout(countdown);
      clearTimeout(effectsTimer);
      unsubscribe();
      void unlistenStatus.then((fn) => fn());
      void unlistenMessage.then((fn) => fn());
      void invoke('remote_stop');
    };
  }, []);

  const videoSrc = useEditorStore((s) => s.videoSrc);

  useEffect(() => {
    const el = editorRefs.video;
    if (!el) return;
    const onEnded = () => store().pause();
    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
  }, [videoSrc]);
}
