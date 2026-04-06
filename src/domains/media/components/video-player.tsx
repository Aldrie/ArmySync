import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '../../../lib/cn';

interface VideoPlayerProps {
  src: string;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [mute, setMute] = useState(false);
  const [hideMouse, setHideMouse] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const volumeRef = useRef<HTMLInputElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const formatDuration = useCallback(() => {
    if (!videoRef.current) return '0:00';
    const minutes = Math.floor(videoRef.current.duration / 60);
    const seconds = Math.floor(videoRef.current.duration % 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  }, []);

  const handlePlayClick = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  }, [playing]);

  const handleSeekbarChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!videoRef.current || !seekBarRef.current) return;
      const value = Number(event.target.value);
      videoRef.current.currentTime = (videoRef.current.duration * value) / 100;
      seekBarRef.current.style.backgroundSize = `${value}% 100%`;
    },
    [],
  );

  const handleVolumeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!videoRef.current || !volumeRef.current) return;
      const value = Number(event.target.value);
      const newVolume = value / 100;
      videoRef.current.volume = newVolume;

      if (newVolume === 0 && !mute) setMute(true);
      else if (newVolume > 0 && mute) setMute(false);

      volumeRef.current.style.backgroundSize = `${value}% 100%`;
    },
    [mute],
  );

  const handleVolumeClick = useCallback(() => {
    if (!videoRef.current || !volumeRef.current) return;
    videoRef.current.volume = mute ? 1 : 0;
    const volumeValue = mute ? '100' : '0';
    volumeRef.current.value = volumeValue;
    volumeRef.current.style.backgroundSize = `${volumeValue}% 100%`;
    setMute(!mute);
  }, [mute]);

  const handleExpandClick = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleMouseMove = useCallback(() => {
    setHideMouse(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setHideMouse(true), 2000);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !seekBarRef.current || !timeRef.current) return;
    const percent =
      (videoRef.current.currentTime * 100) / videoRef.current.duration;
    seekBarRef.current.style.backgroundSize = `${percent + 0.1}% 100%`;
    seekBarRef.current.value = percent.toString();

    const currentMinutes = Math.floor(videoRef.current.currentTime / 60);
    const currentSeconds = Math.floor(videoRef.current.currentTime % 60);
    timeRef.current.innerText = `${currentMinutes}:${currentSeconds < 10 ? `0${currentSeconds}` : currentSeconds} / ${formatDuration()}`;
  }, [formatDuration]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative flex items-center justify-center w-full h-full bg-black overflow-hidden',
        hideMouse ? 'cursor-none' : 'cursor-default',
      )}
      onMouseMove={handleMouseMove}
    >
      <video
        src={src}
        ref={videoRef}
        className="min-w-full max-h-full [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden"
        onDoubleClick={handleExpandClick}
        onClick={handlePlayClick}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />

      <div
        className={cn(
          'absolute bottom-0 w-full flex items-center gap-3 px-5 py-3 bg-player-bg transition-transform duration-200 z-50',
          hideMouse
            ? 'translate-y-full'
            : 'translate-y-full group-hover:translate-y-0',
        )}
      >
        <button
          type="button"
          className="flex items-center justify-center bg-transparent border-none text-white cursor-pointer"
          onClick={handlePlayClick}
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>

        <div className="flex-1">
          <input
            type="range"
            className="range-fill w-full h-1.5 rounded-sm bg-zinc-700"
            min="0"
            max="100"
            step="0.01"
            defaultValue="0"
            ref={seekBarRef}
            onChange={handleSeekbarChange}
          />
        </div>

        <span
          ref={timeRef}
          className="text-xs font-semibold text-white whitespace-nowrap min-w-24 text-center"
        >
          0:00 / 0:00
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center justify-center bg-transparent border-none text-white cursor-pointer"
            onClick={handleVolumeClick}
          >
            {mute ? (
              <VolumeX className="size-5" />
            ) : (
              <Volume2 className="size-5" />
            )}
          </button>
          <input
            type="range"
            className="range-fill w-20 h-1.5 rounded-sm bg-zinc-700"
            min="0"
            max="100"
            step="0.01"
            defaultValue="100"
            ref={volumeRef}
            style={{ backgroundSize: '100% 100%' }}
            onChange={handleVolumeChange}
          />
        </div>

        <button
          type="button"
          className="flex items-center justify-center bg-transparent border-none text-white cursor-pointer ml-2"
          onClick={handleExpandClick}
        >
          <Maximize className="size-5" />
        </button>
      </div>
    </div>
  );
}
