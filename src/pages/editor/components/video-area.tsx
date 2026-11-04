import { Music } from 'lucide-react';
import type { RefObject } from 'react';

import { useAppStore } from '../../../stores/app-store';
import { useEditorStore } from '../../../stores/editor-store';

interface VideoAreaProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  onLoadedData: () => void;
  onTimeUpdate: () => void;
}

export default function VideoArea({
  videoRef,
  videoSrc,
  onLoadedData,
  onTimeUpdate,
}: VideoAreaProps) {
  const mediaType = useEditorStore((s) => s.mediaType);
  const songName = useAppStore((s) => s.activeProject?.name);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-black ring-1 ring-border">
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          className="h-full w-full object-contain"
          onLoadedData={onLoadedData}
          onTimeUpdate={onTimeUpdate}
        />
      )}
      {mediaType === 'audio' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-surface-high text-on-surface-variant">
            <Music className="size-5" />
          </div>
          <p className="max-w-full truncate text-sm font-medium text-on-surface">
            {songName}
          </p>
        </div>
      )}
    </div>
  );
}
