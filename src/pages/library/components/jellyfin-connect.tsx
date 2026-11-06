import { ExternalLink, Loader2, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { openUrl } from '@tauri-apps/plugin-opener';

import { ErrorAlert, Field, INPUT } from './form';
import Button from '../../../components/button';
import {
  type JellyfinServerInfo,
  type JellyfinStatus,
  loginJellyfin,
  pollQuickConnect,
  probeJellyfin,
  startQuickConnect,
} from '../../../domains/jellyfin';
import { errorMessage } from '../../../lib/format';

const POLL_MS = 2000;

export default function JellyfinConnect({
  onConnected,
}: {
  onConnected: (status: JellyfinStatus) => void;
}) {
  const id = useId();
  const [url, setUrl] = useState('');
  const [server, setServer] = useState<JellyfinServerInfo | null>(null);
  const [usePassword, setUsePassword] = useState(false);
  const [quick, setQuick] = useState<{ code: string; secret: string } | null>(
    null,
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const base = url.trim().replace(/\/+$/, '');

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleUrl = (value: string) => {
    setUrl(value);
    setServer(null);
    setQuick(null);
    setUsePassword(false);
    setError('');
  };

  const handleProbe = () =>
    run(async () => setServer(await probeJellyfin(base)));

  const handleQuickConnect = () =>
    run(async () => setQuick(await startQuickConnect(base)));

  const handleLogin = () =>
    run(async () => onConnected(await loginJellyfin(base, username, password)));

  const handleUsePassword = () => {
    setUsePassword(true);
    setQuick(null);
    setError('');
  };

  useEffect(() => {
    if (!quick) return;
    let cancelled = false;
    let timer = 0;
    const tick = async () => {
      try {
        const status = await pollQuickConnect(base, quick.secret);
        if (cancelled) return;
        if (status) onConnected(status);
        else timer = window.setTimeout(() => void tick(), POLL_MS);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      }
    };
    timer = window.setTimeout(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [quick, base, onConnected]);

  const showPassword = server && (!server.quickConnect || usePassword);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleProbe();
        }}
      >
        <Field label="Server URL" htmlFor={`${id}-url`}>
          <div className="flex gap-2">
            <input
              id={`${id}-url`}
              type="url"
              value={url}
              onChange={(e) => handleUrl(e.target.value)}
              placeholder="http://192.168.1.10:8096"
              className={INPUT}
            />
            <Button type="submit" disabled={!base || busy}>
              {busy && !server && <Loader2 className="animate-spin" />}
              Connect
            </Button>
          </div>
        </Field>
      </form>

      {server && (
        <div className="flex flex-col gap-1.5 text-xs">
          <p className="text-on-surface-variant">
            {server.name} · Jellyfin {server.version}
          </p>
          {!server.supported && (
            <p className="flex items-start gap-2 text-on-surface-variant">
              <TriangleAlert className="mt-px size-3.5 shrink-0 text-error" />
              This server is older than Jellyfin 10.10 and may not work.
            </p>
          )}
        </div>
      )}

      {server && !showPassword && (
        <div className="flex flex-col items-start gap-3">
          {quick ? (
            <>
              <p className="font-mono text-3xl font-semibold tracking-widest text-on-surface">
                {quick.code}
              </p>
              <p className="text-xs text-on-surface-variant">
                Approve this code in Jellyfin (profile menu → Quick Connect).
              </p>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => void openUrl(`${base}/web/#/quickconnect`)}
                >
                  <ExternalLink />
                  Open Jellyfin
                </Button>
                {error ? (
                  <Button
                    size="sm"
                    intent="tonal"
                    onClick={() => void handleQuickConnect()}
                    disabled={busy}
                  >
                    Try again
                  </Button>
                ) : (
                  <span
                    role="status"
                    className="flex items-center gap-2 text-xs text-outline"
                  >
                    <Loader2 className="size-3.5 animate-spin" />
                    Waiting for approval…
                  </span>
                )}
              </div>
            </>
          ) : (
            <Button
              intent="primary"
              onClick={() => void handleQuickConnect()}
              disabled={busy}
            >
              {busy && <Loader2 className="animate-spin" />}
              Use Quick Connect
            </Button>
          )}
          <button
            type="button"
            onClick={handleUsePassword}
            className="cursor-pointer text-xs text-primary hover:underline"
          >
            Sign in with password instead
          </button>
        </div>
      )}

      {showPassword && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
        >
          <Field label="Username" htmlFor={`${id}-user`}>
            <input
              id={`${id}-user`}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Password" htmlFor={`${id}-password`}>
            <input
              id={`${id}-password`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT}
            />
          </Field>
          <Button
            type="submit"
            intent="primary"
            className="self-start"
            disabled={!username.trim() || busy}
          >
            {busy && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
        </form>
      )}

      {error && <ErrorAlert message={error} />}
    </div>
  );
}
