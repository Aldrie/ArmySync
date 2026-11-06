import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { listen } from '@tauri-apps/api/event';

import { CALIBRATION_TAPS, CALIBRATION_WARMUP } from '../../../domains/remote';
import { easeOut } from '../../../lib/animations';
import { cn } from '../../../lib/cn';

const FLASH_MS = 80;
const BEEP_S = 0.03;
const BEEP_HZ = 1000;
const BEEP_GAIN = 0.2;
const HIDE_AFTER_MS = 1500;

interface Tick {
  mode: 'sound' | 'image';
  beat: number;
  total: number;
  warmup: boolean;
}

export default function CalibrationOverlay() {
  const [flash, setFlash] = useState(false);
  const [tick, setTick] = useState<Tick | null>(null);

  useEffect(() => {
    let audio: AudioContext | null = null;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const beep = () => {
      audio ??= new AudioContext();
      void audio.resume();
      const osc = audio.createOscillator();
      osc.frequency.value = BEEP_HZ;
      const gain = audio.createGain();
      gain.gain.value = BEEP_GAIN;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + BEEP_S);
    };

    const unlisten = listen<Tick>('remote-calibration-tick', (event) => {
      const next = event.payload;
      setTick(next);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setTick(null), HIDE_AFTER_MS);

      if (next.mode === 'sound') {
        beep();
        return;
      }
      setFlash(true);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setFlash(false), FLASH_MS);
    });

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(hideTimer);
      void unlisten.then((fn) => fn());
      void audio?.close();
    };
  }, []);

  const done = tick !== null && tick.beat === tick.total - 1;

  return (
    <>
      {flash && (
        <div className="pointer-events-none fixed inset-0 z-60 bg-white" />
      )}
      <AnimatePresence>
        {tick && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={easeOut}
            className="pointer-events-none fixed top-6 left-1/2 z-61 flex -translate-x-1/2 flex-col items-center gap-3 rounded-xl border border-border-strong bg-surface-container px-6 py-4 shadow-popover"
          >
            <span className="font-display text-sm font-bold tracking-tight text-on-surface">
              Calibrating delay
            </span>
            <span className="text-xs text-on-surface-variant">
              {done
                ? 'Done — check the result on your phone'
                : tick.warmup
                  ? `Listen… catch the rhythm (${tick.mode === 'sound' ? 'clicks' : 'flashes'})`
                  : 'Tap on your phone with each beat'}
            </span>
            <span className="flex items-center gap-4">
              <span className="flex gap-1.5">
                {Array.from({ length: CALIBRATION_WARMUP }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'size-2 rounded-full ring-1 ring-outline',
                      i <= tick.beat && 'bg-on-surface ring-on-surface',
                    )}
                  />
                ))}
              </span>
              <span className="flex gap-1.5">
                {Array.from({ length: CALIBRATION_TAPS }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'size-2 rounded-full bg-surface-highest',
                      i + CALIBRATION_WARMUP <= tick.beat && 'bg-primary',
                    )}
                  />
                ))}
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
