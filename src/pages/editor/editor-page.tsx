import { useEffect, useRef } from 'react';

import ControlsBar from './components/controls-bar';
import EffectsSidebar from './components/effects-sidebar';
import LightstickPanel from './components/lightstick-panel';
import TimelinePanel from './components/timeline-panel';
import VideoArea from './components/video-area';
import ResizePanel from '../../components/resize-panel';
import type { LightstickRef } from '../../domains/lightstick';
import { editorRefs } from '../../stores/editor-refs';
import { useEditorStore } from '../../stores/editor-store';

export default function EditorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightstickRef = useRef<LightstickRef>(null);

  useEffect(() => {
    editorRefs.video = videoRef.current;
    editorRefs.lightstick = lightstickRef.current;
    return () => {
      editorRefs.video = null;
      editorRefs.lightstick = null;
    };
  });

  const videoSrc = useEditorStore((s) => s.videoSrc);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const videoDuration = useEditorStore((s) => s.videoDuration);
  const effects = useEditorStore((s) => s.effects);
  const waveform = useEditorStore((s) => s.waveform);

  const play = useEditorStore((s) => s.play);
  const pause = useEditorStore((s) => s.pause);
  const seekDelta = useEditorStore((s) => s.seekDelta);
  const seekPercent = useEditorStore((s) => s.seekPercent);
  const tick = useEditorStore((s) => s.tick);
  const handleVideoLoad = useEditorStore((s) => s.handleVideoLoad);
  const openVideoFile = useEditorStore((s) => s.openVideoFile);
  const loadEffectFile = useEditorStore((s) => s.loadEffectFile);

  return (
    <div className="flex flex-col w-full h-full bg-surface overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <ResizePanel
          direction="right"
          defaultSize={{ width: 360, height: '100%' }}
          minWidth={280}
          maxWidth={420}
        >
          <EffectsSidebar />
        </ResizePanel>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 min-h-0 p-3">
            <VideoArea
              videoRef={videoRef}
              videoSrc={videoSrc}
              onOpenVideo={() => void openVideoFile()}
              onLoadedData={handleVideoLoad}
              onTimeUpdate={() => {
                if (videoRef.current) tick(videoRef.current.currentTime);
              }}
            />
          </div>
          <ControlsBar
            videoRef={videoRef}
            isPlaying={isPlaying}
            onPlay={play}
            onPause={pause}
            onSeekDelta={seekDelta}
          />
        </div>

        <ResizePanel
          direction="left"
          defaultSize={{ width: 300, height: '100%' }}
          minWidth={240}
          maxWidth={300}
        >
          <LightstickPanel
            lightstickRef={lightstickRef}
            onLoadEffectFile={() => void loadEffectFile()}
          />
        </ResizePanel>
      </div>

      <ResizePanel
        direction="top"
        defaultSize={{ width: '100%', height: 380 }}
        minHeight={200}
        maxHeight={420}
      >
        <TimelinePanel
          effects={effects}
          videoDuration={videoDuration}
          waveform={waveform}
          onSeek={seekPercent}
        />
      </ResizePanel>
    </div>
  );
}
