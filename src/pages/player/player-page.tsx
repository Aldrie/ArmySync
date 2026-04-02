import { VideoPlayer } from '../../domains/media';

const DEV_VIDEO_PATH = '/example.mp4';

export default function PlayerPage() {
  const videoSrc = import.meta.env.DEV ? DEV_VIDEO_PATH : '';

  return (
    <div className="flex justify-center items-center w-full h-full bg-surface py-11 px-32">
      {videoSrc ? (
        <VideoPlayer src={videoSrc} />
      ) : (
        <span className="text-zinc-500 text-sm">No video loaded</span>
      )}
    </div>
  );
}
