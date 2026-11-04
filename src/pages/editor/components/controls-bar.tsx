import {
  Play,
  Pause,
  FastForward,
  Rewind,
  Undo2,
  Redo2,
  Volume2,
  Volume1,
  VolumeOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import IconButton from '../../../components/icon-button';
import Slider from '../../../components/slider';
import type { SliderRef } from '../../../components/slider';
import { modKey } from '../../../lib/keys';
import { useEditorStore } from '../../../stores/editor-store';

export default function ControlsBar() {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const volume = useEditorStore((s) => s.volume);
  const muted = useEditorStore((s) => s.muted);

  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);

  const togglePlayPause = useEditorStore((s) => s.togglePlayPause);
  const seekStep = useEditorStore((s) => s.seekStep);
  const setVolume = useEditorStore((s) => s.setVolume);
  const toggleMute = useEditorStore((s) => s.toggleMute);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

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
    <div className="flex h-14 shrink-0 items-center px-4">
      <div className="flex flex-1 items-center gap-0.5">
        <IconButton
          label={`Undo (${modKey}Z)`}
          onClick={undo}
          disabled={!canUndo}
        >
          <Undo2 />
        </IconButton>
        <IconButton
          label={`Redo (${modKey}⇧Z)`}
          onClick={redo}
          disabled={!canRedo}
        >
          <Redo2 />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          label="Rewind (←)"
          onClick={(e) => seekStep(-1, e.shiftKey)}
        >
          <Rewind fill="currentColor" />
        </IconButton>
        <IconButton
          size="md"
          label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="rounded-full bg-on-surface text-surface shadow-[0_1px_2px_rgba(0,0,0,0.5)] hover:bg-white hover:text-surface [&_svg]:size-4"
          onClick={togglePlayPause}
        >
          {isPlaying ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" className="translate-x-px" />
          )}
        </IconButton>
        <IconButton
          label="Fast forward (→)"
          onClick={(e) => seekStep(1, e.shiftKey)}
        >
          <FastForward fill="currentColor" />
        </IconButton>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <IconButton
          label={muted ? 'Unmute' : 'Mute'}
          onClick={handleToggleMute}
        >
          <VolumeIcon />
        </IconButton>
        <Slider
          ref={sliderRef}
          min={0}
          max={100}
          step={1}
          defaultValue={25}
          aria-label="Volume"
          className="w-24"
          onChange={handleVolumeChange}
        />
      </div>
    </div>
  );
}
