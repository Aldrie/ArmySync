import { ChevronLeft } from 'lucide-react';
import { type PointerEvent, useEffect, useState } from 'react';

import Button from '../../components/button';
import { computeLatency } from '../../domains/remote';
import { cn } from '../../lib/cn';
import { useRemoteStore } from '../store';

type Reference = 'sound' | 'image';

const TAPS = 16;
const RUN_MS = 1000 + TAPS * 600 + 1000;
const FLASH_MS = 90;
const REFERENCES: { value: Reference; label: string; hint: string }[] = [
  {
    value: 'sound',
    label: 'By sound',
    hint: 'of the click you hear — with the same headphones or speakers as the show',
  },
  {
    value: 'image',
    label: 'By image',
    hint: 'of the flash you see on the Mac screen',
  },
];

const signed = (ms: number) => `${ms >= 0 ? '+' : '−'}${Math.abs(ms)} ms`;

export default function CalibrateScreen() {
  const clicks = useRemoteStore((s) => s.calibrationClicks);
  const { calibrate, saveLatency, setMode } = useRemoteStore.getState();

  const [reference, setReference] = useState<Reference>('sound');
  const [taps, setTaps] = useState<number[]>([]);
  const [run, setRun] = useState(0);
  const [running, setRunning] = useState(true);
  const [flash, setFlash] = useState(false);

  // ponytail: the Mac runs overlapping calibrations in parallel, so no restart until this run is over
  const busy = running && clicks.length < TAPS;
  const result = computeLatency(clicks, taps);

  useEffect(() => {
    const id = setTimeout(() => setRunning(false), RUN_MS);
    return () => clearTimeout(id);
  }, [run]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(id);
  }, [flash]);

  const start = (value: Reference) => {
    setReference(value);
    setTaps([]);
    setRunning(true);
    setRun(run + 1);
    calibrate(value);
  };

  const tap = (e: PointerEvent<HTMLButtonElement>) => {
    if (taps.length >= TAPS) return;
    setTaps([...taps, e.timeStamp + useRemoteStore.getState().offsetMs]);
    setFlash(true);
  };

  return (
    <div className="relative h-full">
      <button
        type="button"
        aria-label="Tap to the beat"
        onPointerDown={tap}
        className={cn(
          'absolute inset-0 flex touch-none flex-col items-center justify-center gap-1.5 bg-black',
          flash && 'bg-surface-low',
        )}
      >
        <span className="text-[26px] font-bold tracking-tight">
          Tap anywhere to the beat
        </span>
        <span className="text-[13px] text-outline">
          {REFERENCES.find((r) => r.value === reference)?.hint}
        </span>
        <span
          aria-label={`${taps.length} of ${TAPS} taps`}
          className="mt-2.5 flex gap-1.5"
        >
          {Array.from({ length: TAPS }, (_, i) => (
            <span
              key={i}
              className={cn(
                'size-2 rounded-full bg-surface-high',
                i < taps.length && 'bg-primary',
              )}
            />
          ))}
        </span>
      </button>

      <header className="pointer-events-none absolute inset-x-8 top-3 flex h-9 items-center gap-2">
        <button
          type="button"
          aria-label="Back"
          onClick={() => setMode('timeline')}
          className="pointer-events-auto flex size-9 items-center justify-center rounded-[9px]"
        >
          <ChevronLeft className="size-[18px]" />
        </button>
        <span className="text-sm font-semibold">Calibrate delay</span>
        <div className="flex-1" />
        <div
          role="group"
          aria-label="Reference"
          className="pointer-events-auto flex gap-0.5 rounded-[9px] border border-border bg-surface-low p-[3px]"
        >
          {REFERENCES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={reference === r.value}
              disabled={busy}
              onClick={() => start(r.value)}
              className={cn(
                'h-7 rounded-md px-2.5 text-[11px] font-semibold text-on-surface-variant disabled:opacity-40',
                reference === r.value && 'bg-surface-high text-primary',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <footer className="pointer-events-none absolute inset-x-8 bottom-4 flex items-center gap-2">
        <span className="text-xs text-outline tabular-nums">
          Your delay{' '}
          <strong className="mx-1 text-lg font-bold text-on-surface">
            {result ? signed(Math.round(result.latencyMs)) : '—'}
          </strong>
          {result && `· spread ±${Math.round(result.spreadMs)} ms`}
        </span>
        <div className="flex-1" />
        <Button
          size="lg"
          disabled={busy}
          onClick={() => start(reference)}
          className="pointer-events-auto"
        >
          Restart
        </Button>
        <Button
          size="lg"
          intent="primary"
          disabled={!result}
          onClick={() => {
            if (!result) return;
            saveLatency(Math.round(result.latencyMs));
            setMode('timeline');
          }}
          className="pointer-events-auto"
        >
          Apply
        </Button>
      </footer>
    </div>
  );
}
