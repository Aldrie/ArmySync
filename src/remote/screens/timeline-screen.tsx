import {
  type LucideIcon,
  Pause,
  Play,
  SlidersHorizontal,
  Timer,
  Undo2,
  Zap,
} from 'lucide-react';
import { type PointerEvent, useEffect, useRef, useState } from 'react';

import Button from '../../components/button';
import { getEffectDefinition } from '../../domains/effects';
import type { TransportSnapshot } from '../../domains/remote';
import { cn } from '../../lib/cn';
import { videoTime } from '../../lib/format';
import ModeHeader from '../components/mode-header';
import { useRemoteStore } from '../store';

const PX_PER_UNIT = 38;
const SENSITIVITY = { fine: 0.25, normal: 1, fast: 4 } as const;
const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  fine: 'Fine',
  normal: 'Normal',
  fast: 'Fast',
};
const SEEK_INTERVAL_MS = 50;
const HALF_STRIP_PX = PX_PER_UNIT * 13;
const NUDGES: [number, string][] = [
  [-1, '−1 s'],
  [-0.5, '−½ s'],
  [-0.25, '−¼ s'],
  [-0.015, '−15 ms'],
  [0.015, '+15 ms'],
  [0.25, '+¼ s'],
  [0.5, '+½ s'],
  [1, '+1 s'],
];

type Sensitivity = keyof typeof SENSITIVITY;

const clock = (t: number) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const seconds = ((ms % 60000) / 1000).toFixed(3).padStart(6, '0');
  return `${Math.floor(ms / 60000)}:${seconds}`;
};

const STATUS = {
  connecting: { label: 'Connecting…', className: 'bg-white/10 text-white/70' },
  open: { label: 'Connected', className: 'bg-[#3ddc84]/12 text-[#7ff0b0]' },
  closed: { label: 'Offline', className: 'bg-error/10 text-error' },
  unauthorized: { label: 'Offline', className: 'bg-error/10 text-error' },
};

function useFrame(active: boolean) {
  const [, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    let id = requestAnimationFrame(function loop() {
      setFrame((f) => f + 1);
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
}

function Toggle({
  on,
  onClick,
  icon: Icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        'flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-surface-low px-3 text-xs font-semibold text-on-surface-variant',
        on && 'border-primary/35 bg-primary/10 text-primary',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

export default function TimelineScreen() {
  const transport = useRemoteStore((s) => s.transport);
  const duration = useRemoteStore((s) => s.duration);
  const effects = useRemoteStore((s) => s.effects);
  const status = useRemoteStore((s) => s.status);
  const settings = useRemoteStore((s) => s.settings);
  const lastTakeStart = useRemoteStore((s) => s.lastTakeStart);
  const countdownUntil = useRemoteStore((s) => s.countdownUntil);
  const { seek, nudge, play, pause, undoTake, songNow, setSettings, setMode } =
    useRemoteStore.getState();

  const [sensitivity, setSensitivity] = useState<Sensitivity>('normal');
  const [scrub, setScrub] = useState<{
    time: number;
    shownUntil: TransportSnapshot | null;
  } | null>(null);
  const drag = useRef<{ x: number; time: number; sentAt: number } | null>(null);

  const scrubbing =
    scrub !== null &&
    (scrub.shownUntil === null || scrub.shownUntil === transport);
  useFrame(transport.playing && !scrubbing);

  const time = scrubbing ? scrub.time : songNow();
  const pxPerSecond = PX_PER_UNIT / SENSITIVITY[sensitivity];
  const span = HALF_STRIP_PX / pxPerSecond;
  const visible = effects.filter(
    (e) => e.to > time - span && e.from < time + span,
  );

  const dragTime = (x: number) => {
    const start = drag.current!;
    return Math.min(
      Math.max(start.time - (x - start.x) / pxPerSecond, 0),
      duration,
    );
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, time, sentAt: 0 };
    setScrub({ time, shownUntil: null });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const t = dragTime(e.clientX);
    setScrub({ time: t, shownUntil: null });
    if (e.timeStamp - drag.current.sentAt < SEEK_INTERVAL_MS) return;
    drag.current.sentAt = e.timeStamp;
    seek(t);
  };

  const endDrag = (t: number) => {
    drag.current = null;
    seek(t);
    setScrub({ time: t, shownUntil: transport });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) endDrag(dragTime(e.clientX));
  };

  const onPointerCancel = () => {
    if (drag.current && scrub) endDrag(scrub.time);
  };

  const counting = countdownUntil !== null;

  return (
    <div className="flex h-full flex-col gap-2.5 pb-4">
      <ModeHeader>
        <span
          className={cn(
            'flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold',
            STATUS[status].className,
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {STATUS[status].label}
        </span>
        <Button size="sm" onClick={() => setMode('calibrate')}>
          <SlidersHorizontal />
          Calibrate
        </Button>
      </ModeHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-8">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-outline">
              {transport.playing ? 'Playing' : 'Paused at'}
            </span>
            <span className="text-3xl leading-none font-bold tracking-tight tabular-nums">
              {clock(time)}{' '}
              <span className="text-base font-medium text-outline">
                / {videoTime(duration)}
              </span>
            </span>
          </div>
          <div
            role="group"
            aria-label="Drag sensitivity"
            className="flex gap-0.5 rounded-[9px] border border-border bg-surface-low p-[3px]"
          >
            {(Object.keys(SENSITIVITY) as Sensitivity[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={sensitivity === key}
                onClick={() => setSensitivity(key)}
                className={cn(
                  'h-7 rounded-md px-2.5 text-[11px] font-semibold text-on-surface-variant',
                  sensitivity === key && 'bg-surface-high text-primary',
                )}
              >
                {SENSITIVITY_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Drag to position"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={time}
          aria-valuetext={clock(time)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="relative h-24 shrink-0 touch-none overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div
            aria-hidden
            className="absolute inset-y-0 [mask-image:linear-gradient(180deg,transparent_55%,#000_55%)]"
            style={{
              left: `calc(50% - ${HALF_STRIP_PX + ((time * pxPerSecond) % PX_PER_UNIT)}px)`,
              width: 2 * HALF_STRIP_PX + 2 * PX_PER_UNIT,
              backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 1px, transparent 1px ${PX_PER_UNIT}px)`,
            }}
          />
          <div aria-hidden className="absolute inset-x-0 top-3.5 h-[30px]">
            {visible.map((effect) => (
              <span
                key={effect.id}
                className="absolute inset-y-0 rounded-md"
                style={{
                  left: `calc(50% + ${(effect.from - time) * pxPerSecond}px)`,
                  width: (effect.to - effect.from) * pxPerSecond,
                  background:
                    getEffectDefinition(effect.type)?.buildStripBackground(
                      effect.params,
                      effect.to - effect.from,
                    ) ?? 'transparent',
                }}
              />
            ))}
          </div>
          <span
            aria-hidden
            className="absolute inset-y-0 left-1/2 -ml-px w-0.5 bg-primary shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
          <span
            aria-hidden
            className="absolute top-0 left-1/2 -ml-1.5 size-3 rounded-b-md bg-primary"
          />
          <span className="absolute bottom-2 left-3 text-[10px] font-semibold text-outline">
            ← drag with your finger →
          </span>
          <span className="absolute right-3 bottom-2 text-[10px] font-semibold text-outline">
            1 cm ≈ {SENSITIVITY[sensitivity]} s
          </span>
        </div>

        <div
          role="group"
          aria-label="Fine jumps"
          className="grid grid-cols-8 gap-1.5"
        >
          {NUDGES.map(([dt, label]) => (
            <button
              key={dt}
              type="button"
              onClick={() => nudge(dt)}
              className="h-10 rounded-[9px] border border-border-strong bg-surface-container text-[13px] font-semibold tabular-nums active:bg-surface-high"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center gap-2">
          <Toggle
            on={settings.autoplay}
            onClick={() => setSettings({ autoplay: !settings.autoplay })}
            icon={Zap}
            label="Auto-play on first tap"
          />
          <Toggle
            on={settings.countdown}
            onClick={() => setSettings({ countdown: !settings.countdown })}
            icon={Timer}
            label="Countdown 3 s"
          />
          <div className="flex-1" />
          <button
            type="button"
            disabled={lastTakeStart === null}
            onClick={undoTake}
            className="flex h-11 flex-col items-start justify-center rounded-[10px] border border-border-strong bg-surface-high px-3.5 disabled:opacity-40"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <Undo2 className="size-3.5" />
              Undo take
            </span>
            {lastTakeStart !== null && (
              <span className="text-[10px] text-outline tabular-nums">
                back to {clock(lastTakeStart)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={transport.playing || counting ? pause : play}
            className="flex h-11 w-28 items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-bold text-on-primary"
          >
            {transport.playing ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
            {transport.playing ? 'Pause' : counting ? 'Cancel' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
