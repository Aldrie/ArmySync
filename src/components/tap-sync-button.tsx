import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_TAPS = 2;
const DEBOUNCE_MS = 4000;

interface BpmEstimate {
  bpm: number;
  isFinalEstimate: boolean;
}

interface TapSyncButtonProps {
  onBpmEstimate: (estimate: BpmEstimate) => void;
}

export default function TapSyncButton({ onBpmEstimate }: TapSyncButtonProps) {
  const [tapCount, setTapCount] = useState(0);
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [ripples, setRipples] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  const tapTimesRef = useRef<number[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const debounceStartRef = useRef<number>(0);

  const resetState = useCallback(() => {
    tapTimesRef.current = [];
    setTapCount(0);
    setCurrentBpm(null);
    setProgress(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (progressFrameRef.current)
      cancelAnimationFrame(progressFrameRef.current);
  }, []);

  const startProgressAnimation = useCallback(() => {
    debounceStartRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - debounceStartRef.current;
      const pct = Math.min(elapsed / DEBOUNCE_MS, 1);
      setProgress(pct);

      if (pct < 1) {
        progressFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (progressFrameRef.current)
      cancelAnimationFrame(progressFrameRef.current);
    progressFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const computeBpm = useCallback((): number | null => {
    const times = tapTimesRef.current;
    if (times.length < MIN_TAPS) return null;

    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(60000 / avgInterval);
  }, []);

  const handleTap = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    setTapCount(tapTimesRef.current.length);

    setRipples((prev) => [...prev, now]);

    const bpm = computeBpm();
    if (bpm !== null) {
      setCurrentBpm(bpm);
      onBpmEstimate({ bpm, isFinalEstimate: false });
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    startProgressAnimation();

    debounceRef.current = setTimeout(() => {
      const finalBpm = computeBpm();
      if (finalBpm !== null) {
        onBpmEstimate({ bpm: finalBpm, isFinalEstimate: true });
      }
      resetState();
    }, DEBOUNCE_MS);
  }, [computeBpm, onBpmEstimate, resetState, startProgressAnimation]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (progressFrameRef.current)
        cancelAnimationFrame(progressFrameRef.current);
    };
  }, []);

  const isActive = tapCount > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">Tap Sync</span>
        {currentBpm !== null && (
          <span className="text-xs text-primary font-mono tabular-nums">
            {currentBpm} BPM
          </span>
        )}
      </div>

      <motion.button
        type="button"
        className="relative overflow-hidden rounded-lg h-10 font-display font-bold text-xs tracking-wider uppercase cursor-pointer select-none border border-outline-variant bg-surface-container text-on-surface-variant transition-colors hover:border-primary/40"
        onClick={handleTap}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30, mass: 0.5 }}
      >
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-primary/10 origin-right"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            style={{ transformOrigin: 'left' }}
            transition={{ duration: 0, ease: 'linear' }}
          />
        )}

        <AnimatePresence>
          {ripples.map((id) => (
            <motion.span
              key={id}
              className="absolute inset-0 rounded-lg bg-primary/20"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onAnimationComplete={() =>
                setRipples((prev) => prev.filter((r) => r !== id))
              }
            />
          ))}
        </AnimatePresence>

        <span className="relative z-10">
          {!isActive && 'Tap to sync'}
          {isActive && tapCount < MIN_TAPS && `Tap… (${tapCount}/${MIN_TAPS})`}
          {isActive &&
            tapCount >= MIN_TAPS &&
            `${currentBpm} BPM · ${tapCount} taps`}
        </span>
      </motion.button>
    </div>
  );
}
