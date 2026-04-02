import {
  Play,
  Pause,
  FastForward,
  Rewind,
  Volume2,
  Volume1,
  VolumeOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import IconButton from '../../../components/icon-button';
import Slider from '../../../components/slider';
import type { SliderRef } from '../../../components/slider';
import { useEditorStore } from '../../../stores/editor-store';

export default function ControlsBar() {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const volume = useEditorStore((s) => s.volume);
  const muted = useEditorStore((s) => s.muted);

  const togglePlayPause = useEditorStore((s) => s.togglePlayPause);
  const seekStep = useEditorStore((s) => s.seekStep);
  const setVolume = useEditorStore((s) => s.setVolume);
  const toggleMute = useEditorStore((s) => s.toggleMute);

  const sliderRef = useRef<SliderRef>(null);

  useEffect(() => {
    sliderRef.current?.setValue(muted ? 0 : volume * 100);
  }, [volume, muted]);

  const effectiveVolume = muted ? 0 : volume;

  const VolumeIcon =
    effectiveVolume === 0
      ? VolumeOff
      : effectiveVolume < 0.5
        ? Volume1
        : Volume2;

  const handleVolumeChange = useCallback(
    (value: number) => setVolume(value / 100),
    [setVolume],
  );

  const handleToggleMute = useCallback(() => {
    const wasMuted = useEditorStore.getState().muted;
    toggleMute();
    const vol = useEditorStore.getState().volume;
    sliderRef.current?.setValue(wasMuted ? vol * 100 : 0);
  }, [toggleMute]);

  return (
    <div className="bg-surface-container flex items-center px-4 py-2.5">
      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <IconButton onClick={(e) => seekStep(-1, e.shiftKey)}>
          <Rewind />
        </IconButton>
        <IconButton size="md" onClick={togglePlayPause}>
          {isPlaying ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </IconButton>
        <IconButton onClick={(e) => seekStep(1, e.shiftKey)}>
          <FastForward />
        </IconButton>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <IconButton onClick={handleToggleMute}>
          <VolumeIcon />
        </IconButton>
        <Slider
          ref={sliderRef}
          min={0}
          max={100}
          step={1}
          defaultValue={25}
          trackColor="var(--color-surface-high)"
          className="w-20 h-1.5 rounded-sm"
          onChange={handleVolumeChange}
        />
      </div>
    </div>
  );
}
