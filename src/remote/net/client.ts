import type {
  MacToPhone,
  PhoneToMac,
  TransportSnapshot,
} from '../../domains/remote';

export type ConnectionStatus =
  | 'connecting'
  | 'open'
  | 'closed'
  | 'unauthorized';

export interface Client {
  send(m: PhoneToMac): void;
  close(): void;
}

export function bestOffset(samples: { offset: number; rtt: number }[]): number {
  const recent = samples.slice(-10);
  if (!recent.length) return 0;
  return recent.reduce((best, s) => (s.rtt < best.rtt ? s : best)).offset;
}

export function songTimeAt(snap: TransportSnapshot, serverNow: number): number {
  return snap.playing
    ? snap.songTime + (serverNow - snap.serverTime) / 1000
    : snap.songTime;
}

export function socketUrl(location: Location): string {
  const params = new URLSearchParams(location.search);
  const url = new URL(params.get('ws') ?? `ws://${location.host}/ws`);
  url.searchParams.set('t', params.get('t') ?? '');
  return url.toString();
}

export function connect(
  url: string,
  onMessage: (m: MacToPhone) => void,
  onStatus: (s: ConnectionStatus) => void,
): Client {
  let socket: WebSocket;
  let pinger: ReturnType<typeof setInterval> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const send = (m: PhoneToMac) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(m));
  };
  const ping = () => send({ type: 'ping', t0: performance.now() });

  const open = () => {
    socket = new WebSocket(url);
    socket.onopen = () => {
      onStatus('open');
      for (let i = 0; i < 5; i++) ping();
      pinger = setInterval(ping, 2000);
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      const m = JSON.parse(event.data) as MacToPhone;
      if (m.type === 'error' && m.message === 'unauthorized') {
        stopped = true;
        onStatus('unauthorized');
      }
      onMessage(m);
    };
    socket.onclose = () => {
      clearInterval(pinger);
      if (stopped) return;
      onStatus('closed');
      retry = setTimeout(open, 1000);
    };
  };

  onStatus('connecting');
  open();
  return {
    send,
    close: () => {
      stopped = true;
      clearTimeout(retry);
      socket.close();
    },
  };
}
