import { invoke } from '@tauri-apps/api/core';

import type { MediaType } from '../project';

export const JELLYFIN_SESSION_EXPIRED =
  'Jellyfin session expired. Sign in again.';
export const JELLYFIN_NOT_SIGNED_IN = 'Not signed in to Jellyfin';
export const JELLYFIN_VERSION_GONE =
  'This video version is no longer on the server';
export const JELLYFIN_SESSION_ERRORS = [
  JELLYFIN_SESSION_EXPIRED,
  JELLYFIN_NOT_SIGNED_IN,
];

export interface JellyfinStatus {
  url: string;
  serverId: string;
  serverName: string;
  userName: string;
}

export interface JellyfinServerInfo {
  url: string;
  name: string;
  version: string;
  id: string;
  supported: boolean;
  quickConnect: boolean;
}

export interface JellyfinItem {
  id: string;
  name: string;
  seriesName: string | null;
  itemType: string;
  mediaType: MediaType;
  duration: number;
  sources: { id: string; name: string }[];
}

export const jellyfinStatus = (): Promise<JellyfinStatus | null> =>
  invoke('jellyfin_status');

export const probeJellyfin = (url: string): Promise<JellyfinServerInfo> =>
  invoke('jellyfin_probe', { url });

export const loginJellyfin = (
  url: string,
  username: string,
  password: string,
): Promise<JellyfinStatus> =>
  invoke('jellyfin_login', { url, username, password });

export const startQuickConnect = (
  url: string,
): Promise<{ code: string; secret: string }> =>
  invoke('jellyfin_quick_connect_start', { url });

export const pollQuickConnect = (
  url: string,
  secret: string,
): Promise<JellyfinStatus | null> =>
  invoke('jellyfin_quick_connect_poll', { url, secret });

export const logoutJellyfin = (): Promise<void> => invoke('jellyfin_logout');

export const searchJellyfin = (term: string): Promise<JellyfinItem[]> =>
  invoke('jellyfin_search', { term });

export const openJellyfinStream = (
  itemId: string,
  mediaSourceId: string,
): Promise<string> => invoke('jellyfin_open_stream', { itemId, mediaSourceId });

export const closeJellyfinStream = (): Promise<void> =>
  invoke('jellyfin_close_stream');

export const jellyfinWaveform = async (
  projectId: string,
  itemId: string,
  mediaSourceId: string,
): Promise<Float32Array> =>
  new Float32Array(
    await invoke<number[]>('jellyfin_waveform', {
      projectId,
      itemId,
      mediaSourceId,
    }),
  );
