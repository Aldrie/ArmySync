import { useEffect, useMemo, useRef } from 'react';

import ControlsBar from './components/controls-bar';
import EffectsSidebar from './components/effects-sidebar';
import LightstickPanel from './components/lightstick-panel';
import TimelinePanel from './components/timeline-panel';
import VideoArea from './components/video-area';
import ResizePanel from '../../components/resize-panel';
import type { LightstickRef } from '../../domains/lightstick';
import { useKeybind } from '../../lib/use-keybind';
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
  const videoDuration = useEditorStore((s) => s.videoDuration);
  const effects = useEditorStore((s) => s.effects);
  const waveform = useEditorStore((s) => s.waveform);
  const waveformLoading = useEditorStore((s) => s.waveformLoading);

  const togglePlayPause = useEditorStore((s) => s.togglePlayPause);
  const seekStep = useEditorStore((s) => s.seekStep);
  const seekPercent = useEditorStore((s) => s.seekPercent);
  const adjustVolume = useEditorStore((s) => s.adjustVolume);
  const tick = useEditorStore((s) => s.tick);
  const handleVideoLoad = useEditorStore((s) => s.handleVideoLoad);
  const openVideoFile = useEditorStore((s) => s.openVideoFile);
  const loadEffectFile = useEditorStore((s) => s.loadEffectFile);

  useKeybind(
    useMemo(
      () => ({
        Space: () => togglePlayPause(),
        ArrowLeft: (e) => seekStep(-1, e.shiftKey),
        ArrowRight: (e) => seekStep(1, e.shiftKey),
        ArrowUp: () => adjustVolume(0.05),
        ArrowDown: () => adjustVolume(-0.05),
      }),
      [togglePlayPause, seekStep, adjustVolume],
    ),
  );

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
              onLoadedData={() => void handleVideoLoad()}
              onTimeUpdate={() => {
                if (videoRef.current) tick(videoRef.current.currentTime);
              }}
            />
          </div>
          <ControlsBar />
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
          waveformLoading={waveformLoading}
          onSeek={seekPercent}
        />
      </ResizePanel>
    </div>
  );
}
