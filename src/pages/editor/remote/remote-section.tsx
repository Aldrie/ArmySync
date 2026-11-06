import { Loader2, Smartphone } from 'lucide-react';
import { toDataURL } from 'qrcode';
import { useCallback, useEffect, useState } from 'react';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import Switch from '../../../components/switch';
import { cn } from '../../../lib/cn';
import PanelSectionHeader from '../components/panel-section-header';

interface Server {
  url: string;
  qr: string;
}

interface RemoteSectionProps {
  open: boolean;
  onToggle: () => void;
}

export default function RemoteSection({ open, onToggle }: RemoteSectionProps) {
  const [enabled, setEnabled] = useState(false);
  const [server, setServer] = useState<Server | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unlisten = listen<{ connected: boolean }>('remote-status', (event) =>
      setConnected(event.payload.connected),
    );
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const url = await invoke<string>('remote_start');
      setServer({ url, qr: await toDataURL(url, { margin: 2, width: 480 }) });
    } catch (e) {
      setError(String(e));
      setEnabled(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setServer(null);
    setConnected(false);
    try {
      await invoke('remote_stop');
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const handleEnabledChange = (next: boolean) => {
    setEnabled(next);
    if (next) void start();
    else void stop();
  };

  const status = connected
    ? 'Connected'
    : enabled
      ? 'Waiting for phone'
      : 'Off';

  return (
    <>
      <PanelSectionHeader
        title="Remote"
        open={open}
        onToggle={onToggle}
        controls="remote-section"
      >
        <span
          title={status}
          aria-label={`Remote: ${status}`}
          className={cn(
            'flex items-center gap-1.5',
            connected
              ? 'text-primary'
              : enabled
                ? 'text-on-surface-variant'
                : 'text-outline',
          )}
        >
          {enabled && (
            <span
              className={cn(
                'size-1.5 rounded-full',
                connected ? 'bg-primary' : 'bg-outline',
              )}
            />
          )}
          <Smartphone className="size-3.5" />
        </span>
      </PanelSectionHeader>

      <section
        id="remote-section"
        className={cn(
          'flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-4',
          open ? 'flex' : 'hidden',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span
              id="remote-enabled-label"
              className="text-xs font-semibold text-on-surface"
            >
              Phone remote
            </span>
            <span className="text-[11px] text-on-surface-variant">
              Record lights by holding pads on your phone
            </span>
          </div>
          <Switch
            checked={enabled}
            onChange={handleEnabledChange}
            labelledBy="remote-enabled-label"
          />
        </div>

        {enabled && !server && !error && (
          <div
            role="status"
            className="flex flex-col items-center gap-3 py-8 text-on-surface-variant"
          >
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs">Starting…</span>
          </div>
        )}

        {server && (
          <div className="flex flex-col items-center gap-3 text-center">
            <img
              src={server.qr}
              alt="QR code to open the remote on your phone"
              className="aspect-square w-full max-w-52 rounded-lg bg-white"
            />
            <span className="select-all break-all font-mono text-[11px] text-on-surface-variant">
              {server.url}
            </span>
            <span role="status" className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'size-2 rounded-full',
                  connected ? 'bg-primary' : 'bg-outline',
                )}
              />
              <span className="text-on-surface">
                {connected ? 'Connected' : 'Waiting for phone…'}
              </span>
            </span>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-error">
            {error}
          </p>
        )}

        <p className="mt-auto text-[11px] text-outline">
          Same Wi-Fi as this Mac. If macOS asks, allow incoming connections for
          ArmySync.
        </p>
      </section>
    </>
  );
}
