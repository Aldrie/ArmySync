import { Loader2, Smartphone } from 'lucide-react';
import { toDataURL } from 'qrcode';
import { useCallback, useEffect, useState } from 'react';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import Button from '../../../components/button';
import IconButton from '../../../components/icon-button';
import Modal from '../../../components/modal';
import { cn } from '../../../lib/cn';

interface Server {
  url: string;
  qr: string;
}

export default function RemoteModal() {
  const [open, setOpen] = useState(false);
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
    }
  }, []);

  const stop = async () => {
    await invoke('remote_stop');
    setServer(null);
    setConnected(false);
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (!server) void start();
  };

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <IconButton
        label="Remote control"
        className="ml-auto"
        onClick={handleOpen}
      >
        <Smartphone />
      </IconButton>

      <Modal
        open={open}
        onClose={handleClose}
        labelledBy="remote-modal-title"
        className="flex w-sm flex-col"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <Smartphone className="size-4 text-primary" />
          <h2
            id="remote-modal-title"
            className="font-display text-base font-bold tracking-tight text-on-surface"
          >
            Remote control
          </h2>
        </div>

        <div className="flex flex-col items-center gap-4 px-5 py-5 text-center">
          {server ? (
            <>
              <img
                src={server.qr}
                alt="QR code to open the remote on your phone"
                className="size-52 rounded-lg bg-white"
              />
              <span className="select-all break-all font-mono text-xs text-on-surface-variant">
                {server.url}
              </span>
              <span role="status" className="flex items-center gap-2 text-sm">
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
            </>
          ) : error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : (
            <div
              role="status"
              className="flex flex-col items-center gap-3 py-10 text-on-surface-variant"
            >
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">Starting…</span>
            </div>
          )}

          <p className="text-xs text-outline">
            If macOS asks, allow incoming connections for ArmySync.
          </p>
        </div>

        {(server || error) && (
          <div className="flex justify-end border-t border-border px-5 py-3">
            {server ? (
              <Button intent="danger" size="sm" onClick={() => void stop()}>
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={() => void start()}>
                Try again
              </Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
