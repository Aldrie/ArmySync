import { EyeOff, Heart, Pause, Play, RotateCcw } from 'lucide-react';
import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { Pad } from '../../domains/remote';
import { cn } from '../../lib/cn';
import ModeHeader from '../components/mode-header';
import { heldPointers } from '../held-pointers';
import {
  edgeShadow,
  formatClock,
  glowOf,
  isBorahaePad,
  padBackground,
  padLook,
} from '../look';
import { type RemoteState, useRemoteStore } from '../store';

const NO_PADS: Pad[] = [];

const activePads = (s: RemoteState) =>
  s.profiles.find((p) => p.id === s.activeProfileId)?.pads ?? NO_PADS;

function Transport() {
  const playing = useRemoteStore((s) => s.transport.playing);
  const duration = useRemoteStore((s) => s.duration);
  const lastTakeStart = useRemoteStore((s) => s.lastTakeStart);
  const timeEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (timeEl.current)
        timeEl.current.textContent = formatClock(
          useRemoteStore.getState().songNow(),
        );
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);

  const togglePlay = () => {
    const store = useRemoteStore.getState();
    if (playing) store.pause();
    else store.play();
  };

  return (
    <>
      <span
        className={cn(
          'flex items-center gap-1.5 text-[11px] font-semibold',
          playing ? 'text-[#ff6b78]' : 'text-[#978e99]',
        )}
      >
        <span className="size-2 rounded-full bg-current" />
        {playing ? 'REC' : 'Paused'}
      </span>
      <span className="mr-2 text-[15px] font-semibold tracking-[-0.01em] tabular-nums">
        <span ref={timeEl} />{' '}
        <span className="font-medium text-[#978e99]">
          / {formatClock(duration)}
        </span>
      </span>
      {lastTakeStart !== null && (
        <button
          type="button"
          aria-label={`Retake: discard the last take and go back to ${formatClock(lastTakeStart)}`}
          onClick={() => useRemoteStore.getState().undoTake()}
          className="flex h-9 items-center gap-1.5 rounded-[9px] border border-white/12 bg-[#1c1b1b] px-3 text-xs font-semibold text-[#e5e2e1] tabular-nums"
        >
          <RotateCcw className="size-4" />
          {formatClock(lastTakeStart)}
        </button>
      )}
      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={togglePlay}
        className="flex h-9 w-11 items-center justify-center rounded-[9px] bg-[#e1b6ff] text-[#43205d]"
      >
        {playing ? (
          <Pause className="size-4" fill="currentColor" />
        ) : (
          <Play className="size-4" fill="currentColor" />
        )}
      </button>
    </>
  );
}

export default function LiveScreen() {
  const pads = useRemoteStore(activePads);
  const radius = useRemoteStore((s) => s.settings.screenRadius);
  const padEls = useRef(new Map<string, HTMLButtonElement>());
  const edgeEl = useRef<HTMLDivElement>(null);
  const [pointers] = useState(() =>
    heldPointers(
      (padId) => useRemoteStore.getState().press(padId),
      (padId) => useRemoteStore.getState().release(padId),
    ),
  );

  useLayoutEffect(() => {
    const paint = () => {
      const { held } = useRemoteStore.getState();
      let active: Pad | null = null;
      for (const pad of pads) {
        const el = padEls.current.get(pad.id);
        if (!el) continue;
        const look = padLook(pad, held);
        Object.assign(el.style, look.style);
        el.setAttribute('aria-pressed', String(look.active));
        const badge = el.querySelector<HTMLElement>('[data-order]');
        if (badge) {
          badge.textContent = String(look.order);
          badge.style.display = look.order ? '' : 'none';
        }
        if (look.active) active = pad;
      }
      if (edgeEl.current)
        edgeEl.current.style.boxShadow = edgeShadow(
          active ? glowOf(active) : null,
        );
    };
    paint();
    return useRemoteStore.subscribe((s, prev) => {
      if (s.held !== prev.held) paint();
    });
  }, [pads]);

  useEffect(() => {
    const up = (e: globalThis.PointerEvent) => pointers.up(e.pointerId);
    const events = [
      'pointerup',
      'pointercancel',
      'lostpointercapture',
    ] as const;
    events.forEach((type) => window.addEventListener(type, up));
    return () => {
      events.forEach((type) => window.removeEventListener(type, up));
      pointers.releaseAll();
    };
  }, [pointers]);

  const down = (e: PointerEvent<HTMLButtonElement>, padId: string) => {
    if (pointers.down(e.pointerId, padId))
      e.currentTarget.setPointerCapture(e.pointerId);
  };

  return (
    <div className="relative flex h-full flex-col gap-2 px-4 pb-4">
      <ModeHeader>
        <Transport />
      </ModeHeader>
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-5 gap-2">
        {pads.map((pad) => (
          <button
            key={pad.id}
            type="button"
            aria-label={
              isBorahaePad(pad)
                ? 'Borahae'
                : [pad.kind, ...pad.colors].join(' ')
            }
            ref={(el) => {
              if (el) padEls.current.set(pad.id, el);
              return () => {
                padEls.current.delete(pad.id);
              };
            }}
            onPointerDown={(e) => down(e, pad.id)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ background: padBackground(pad) }}
            className="relative flex touch-none items-center justify-center overscroll-none rounded-[14px] p-0 select-none [-webkit-touch-callout:none]"
          >
            {pad.kind === 'blackout' && (
              <EyeOff
                className="size-[26px] text-[#cec3d0]"
                strokeWidth={1.8}
              />
            )}
            {isBorahaePad(pad) && (
              <Heart
                className="size-[26px] text-white/92"
                fill="currentColor"
                strokeWidth={0}
              />
            )}
            <span
              data-order
              className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-[5px] text-[11px] font-bold text-white"
            />
          </button>
        ))}
      </div>
      <div
        ref={edgeEl}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{ borderRadius: radius }}
      />
    </div>
  );
}
