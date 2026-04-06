import type { RefObject } from 'react';
import { useRef } from 'react';

import * as format from '../../../lib/format';
import { useTransientTime } from '../../../stores/use-transient-time';

interface VideoAreaProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  title: string;
  onOpenVideo: () => void;
  onLoadedData: () => void;
  onTimeUpdate: () => void;
}

export default function VideoArea({
  videoRef,
  videoSrc,
  title,
  onOpenVideo,
  onLoadedData,
  onTimeUpdate,
}: VideoAreaProps) {
  const timeDisplayRef = useRef<HTMLSpanElement>(null);

  useTransientTime((time) => {
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = format.videoTime(time);
    }
  });

  return (
    <div className="w-full h-full rounded-md overflow-hidden bg-black relative flex items-center justify-center">
      {videoSrc ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-auto"
            onLoadedData={onLoadedData}
            onTimeUpdate={onTimeUpdate}
          />

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-10 bg-linear-to-t from-black/70 to-transparent flex items-end justify-between">
            <div>
              <span className="block font-display text-[10px] tracking-widest uppercase text-primary mb-1">
                Now Playing
              </span>
              <span className="block font-display font-bold text-lg text-on-surface">
                {title || 'Untitled'}
              </span>
            </div>
            <span
              ref={timeDisplayRef}
              className="font-display font-bold text-on-surface tabular-nums"
            >
              {format.videoTime(0)}
            </span>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="text-on-surface-variant hover:text-on-surface transition-colors text-sm cursor-pointer bg-surface-high hover:bg-surface-highest rounded-md px-4 py-2"
          onClick={onOpenVideo}
        >
          Open Video File
        </button>
      )}
    </div>
  );
}
