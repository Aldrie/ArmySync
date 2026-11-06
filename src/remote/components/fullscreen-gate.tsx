import { Maximize } from 'lucide-react';
import { useEffect, useState } from 'react';

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

const supportsFullscreen = () =>
  typeof document.documentElement.requestFullscreen === 'function';

const isFullscreen = () => document.fullscreenElement !== null;

const enterFullscreen = async () => {
  await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  await (screen.orientation as LockableOrientation)
    .lock?.('landscape')
    .catch(() => undefined);
};

export default function FullscreenGate() {
  const supported = supportsFullscreen();
  const [fullscreen, setFullscreen] = useState(isFullscreen);
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sync = () => setFullscreen(isFullscreen());
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  if (fullscreen || dismissed) return null;

  const handleClick = () => {
    if (!supported) {
      setDismissed(true);
      return;
    }
    setFailed(false);
    enterFullscreen().catch(() => setFailed(true));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-gate-title"
      className="absolute inset-0 z-60 flex flex-col items-center justify-center gap-5 bg-black px-8 text-center"
    >
      <h1
        id="fullscreen-gate-title"
        className="font-display text-xl font-bold tracking-tight text-on-surface"
      >
        ArmySync Remote
      </h1>
      <p className="max-w-sm text-sm text-on-surface-variant">
        {supported
          ? 'The remote runs in landscape fullscreen, like a video.'
          : 'This browser can’t go fullscreen. Turn your phone sideways to use the remote.'}
      </p>
      <button
        type="button"
        onClick={handleClick}
        className="flex h-14 cursor-pointer items-center gap-3 rounded-xl bg-primary px-8 text-base font-bold text-on-primary"
      >
        <Maximize className="size-5" aria-hidden />
        {supported ? 'Enter fullscreen' : 'Continue'}
      </button>
      {failed && (
        <p role="alert" className="text-xs text-error">
          Fullscreen was blocked. Tap the button again.
        </p>
      )}
    </div>
  );
}
