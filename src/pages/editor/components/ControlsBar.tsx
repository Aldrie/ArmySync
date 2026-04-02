import { Play, Pause, FastForward, Rewind } from 'lucide-react';
import { tv } from 'tailwind-variants';
interface ControlsBarProps {
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
  isPlaying,
  onPlay,
  onPause,
  onSeekDelta,
}: ControlsBarProps) {
  return (
    <div className="bg-surface-container flex items-center justify-between px-4 py-2.5">
      {/* Transport controls */}
      <div className="flex items-center gap-1 mx-auto">
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
    </div>
  );
}
