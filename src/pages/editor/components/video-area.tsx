import { Film } from 'lucide-react';
import type { RefObject } from 'react';

import Button from '../../../components/button';

interface VideoAreaProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  onOpenVideo: () => void;
  onLoadedData: () => void;
  onTimeUpdate: () => void;
}

export default function VideoArea({
  videoRef,
  videoSrc,
  onOpenVideo,
  onLoadedData,
  onTimeUpdate,
}: VideoAreaProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-black ring-1 ring-border">
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="h-full w-full object-contain"
          onLoadedData={onLoadedData}
          onTimeUpdate={onTimeUpdate}
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-surface-high text-on-surface-variant">
            <Film className="size-5" />
          </div>
          <Button onClick={onOpenVideo}>Open Video File</Button>
        </div>
      )}
    </div>
  );
}
