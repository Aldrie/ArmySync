import { Music } from 'lucide-react';
import type { RefObject } from 'react';

import Button from '../../../components/button';
import { getSongMedia, isJellyfinMedia } from '../../../domains/project';
import { useAppStore } from '../../../stores/app-store';
import { useEditorStore } from '../../../stores/editor-store';

const SERVER_REFUSALS = [
  'Jellyfin session expired. Sign in again.',
  'This video version is no longer on the server',
];

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
  const mediaError = useEditorStore((s) => s.mediaError);
  const streaming = useEditorStore((s) => {
    const song = s.project && getSongMedia(s.project);
    return !!song && isJellyfinMedia(song.media);
  });
  const setMediaError = useEditorStore((s) => s.setMediaError);
  const retryMedia = useEditorStore((s) => s.retryMedia);
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
          onError={() => {
            if (streaming) setMediaError('The video stream stopped.');
          }}
        />
      )}
      {mediaError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center">
          <p className="text-sm font-medium text-on-surface">
            {SERVER_REFUSALS.some((m) => mediaError.startsWith(m))
              ? "Can't play from Jellyfin"
              : 'Jellyfin server unreachable'}
          </p>
          <p className="max-w-full text-xs text-on-surface-variant">
            {mediaError}
          </p>
          <Button size="sm" onClick={() => void retryMedia()}>
            Retry
          </Button>
        </div>
      ) : (
        mediaType === 'audio' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-surface-high text-on-surface-variant">
              <Music className="size-5" />
            </div>
            <p className="max-w-full truncate text-sm font-medium text-on-surface">
              {songName}
            </p>
          </div>
        )
      )}
    </div>
  );
}
