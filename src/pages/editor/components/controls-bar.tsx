import {
  Play,
  Pause,
  FastForward,
  Rewind,
  Volume2,
  Volume1,
  VolumeOff,
} from 'lucide-react';
import type { RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { tv } from 'tailwind-variants';

import Slider from '../../../components/slider';
import type { SliderRef } from '../../../components/slider';

interface ControlsBarProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeekDelta: (delta: number) => void;
}

const controlButton = tv({
  base: 'text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer',
  variants: {
    size: {
      large: 'p-2 [&_svg]:size-5',
      small: 'p-1.5 [&_svg]:size-4',
    },
  },
  defaultVariants: {
    size: 'small',
  },
});

export default function ControlsBar({
  videoRef,
  isPlaying,
  onPlay,
  onPause,
  onSeekDelta,
}: ControlsBarProps) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const sliderRef = useRef<SliderRef>(null);

  const effectiveVolume = muted ? 0 : volume;

  const VolumeIcon =
    effectiveVolume === 0
      ? VolumeOff
      : effectiveVolume < 0.5
        ? Volume1
        : Volume2;

  const handleVolumeChange = useCallback(
    (value: number) => {
      const normalized = value / 100;
      setVolume(normalized);
      setMuted(normalized === 0);
      if (videoRef.current) {
        videoRef.current.volume = normalized;
        videoRef.current.muted = normalized === 0;
      }
    },
    [videoRef],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
    }
    sliderRef.current?.setValue(next ? 0 : volume * 100);
  }, [muted, volume, videoRef]);

  return (
    <div className="bg-surface-container flex items-center px-4 py-2.5">
      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={controlButton()}
          onClick={() => onSeekDelta(-5)}
        >
          <Rewind />
        </button>
        <button
          type="button"
          className={controlButton({ size: 'large' })}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          className={controlButton()}
          onClick={() => onSeekDelta(5)}
        >
          <FastForward />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <button type="button" className={controlButton()} onClick={toggleMute}>
          <VolumeIcon />
        </button>
        <Slider
          ref={sliderRef}
          min={0}
          max={100}
          step={1}
          defaultValue={100}
          trackColor="var(--color-surface-high)"
          className="w-20 h-1.5 rounded-sm"
          onChange={handleVolumeChange}
        />
      </div>
    </div>
  );
}
