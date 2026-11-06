import { type ComponentType, useEffect } from 'react';

import CountdownOverlay from './components/countdown-overlay';
import CalibrateScreen from './screens/calibrate-screen';
import EditScreen from './screens/edit-screen';
import LiveScreen from './screens/live-screen';
import TimelineScreen from './screens/timeline-screen';
import { type Mode, useRemoteStore } from './store';

const SCREENS: Record<Mode, ComponentType> = {
  live: LiveScreen,
  timeline: TimelineScreen,
  edit: EditScreen,
  calibrate: CalibrateScreen,
};

const NOTICE_MS = 3000;

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

const enterFullscreen = () => {
  Promise.resolve()
    .then(() => document.documentElement.requestFullscreen())
    .then(() => (screen.orientation as LockableOrientation).lock?.('landscape'))
    .catch(() => {});
};

export default function App() {
  const mode = useRemoteStore((s) => s.mode);
  const status = useRemoteStore((s) => s.status);
  const notice = useRemoteStore((s) => s.notice);
  const Screen = SCREENS[mode];

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(
      () => useRemoteStore.setState({ notice: null }),
      NOTICE_MS,
    );
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    useRemoteStore.getState().start();
    window.addEventListener('pointerdown', enterFullscreen, { once: true });
    return () => window.removeEventListener('pointerdown', enterFullscreen);
  }, []);

  return (
    <div
      className="relative h-dvh overflow-hidden bg-black text-white select-none touch-none overscroll-none [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {status === 'unauthorized' ? (
        <div className="flex h-full items-center justify-center text-lg">
          Scan the QR code again
        </div>
      ) : (
        <>
          <Screen />
          <CountdownOverlay />
        </>
      )}
      {status === 'closed' && (
        <div className="absolute inset-x-0 top-0 bg-red-600 py-1 text-center text-sm">
          Reconnecting…
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-50 bg-[#1c1b1b] py-1.5 text-center text-sm text-[#e5e2e1]"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
