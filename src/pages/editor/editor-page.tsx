import { useCallback, useRef, useState } from 'react';

import { open } from '@tauri-apps/plugin-dialog';

import ControlsBar from './components/controls-bar';
import EffectsSidebar from './components/effects-sidebar';
import LightstickPanel from './components/lightstick-panel';
import TimelinePanel from './components/timeline-panel';
import type { TimelinePanelRef } from './components/timeline-panel';
import VideoArea from './components/video-area';
import ResizePanel from '../../components/resize-panel';
import type { IEffect } from '../../domains/effects';
import { sync, effectFile } from '../../domains/effects';
import type { LightstickRef } from '../../domains/lightstick';
import { extractWaveform } from '../../lib/audio';

const DEV_VIDEO_PATH = '/example.mp4';

export default function EditorPage() {
  const [effects, setEffects] = useState<IEffect[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState(
    import.meta.env.DEV ? DEV_VIDEO_PATH : '',
  );
  const [waveform, setWaveform] = useState<Float32Array | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lightstickRef = useRef<LightstickRef>(null);
  const timelineRef = useRef<TimelinePanelRef>(null);

  const playVideo = useCallback(() => {
    videoRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pauseVideo = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seekDelta = useCallback((delta: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration, videoRef.current.currentTime + delta),
    );
  }, []);

  const handleSeek = useCallback((percent: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = videoRef.current.duration * (percent / 100);
  }, []);

  const handleVideoTimeChange = useCallback(() => {
    if (!videoRef.current) return;

    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    sync(effects, time, (color) => lightstickRef.current?.setColor(color));

    const videoPercent = ((time * 100) / videoRef.current.duration).toFixed(2);

    timelineRef.current?.updatePosition(Number(videoPercent));
  }, [effects]);

  const handleVideoLoad = useCallback(() => {
    if (!videoRef.current) return;
    setVideoDuration(videoRef.current.duration);

    const src = videoRef.current.currentSrc || videoRef.current.src;
    extractWaveform(src).then(setWaveform).catch(console.error);
  }, []);

  const loadColorsFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Effect Files', extensions: ['async', 'txt'] }],
      });

      if (!selected) return;

      const fileString = await effectFile.read(selected);
      const fileEffects = effectFile.parseString(fileString);
      setEffects(fileEffects);
    } catch (err) {
      console.error('Failed to load effect file:', err);
    }
  }, []);

  const handleOpenVideo = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Video Files', extensions: ['mp4', 'webm', 'mkv', 'avi'] },
        ],
      });

      if (selected) {
        setVideoSrc(`asset://localhost/${selected}`);
      }
    } catch (err) {
      console.error('Failed to open video:', err);
    }
  }, []);

  return (
    <div className="flex flex-col w-full h-full bg-surface overflow-hidden">
      {/* Top area: effects + video/controls + lightstick */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — resizable width */}
        <ResizePanel
          direction="right"
          defaultSize={{ width: 360, height: '100%' }}
          minWidth={280}
          maxWidth={420}
        >
          <EffectsSidebar />
        </ResizePanel>

        {/* Center: video + controls (controls don't bleed into sidebars) */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 min-h-0 p-3">
            <VideoArea
              videoRef={videoRef}
              videoSrc={videoSrc}
              currentTime={currentTime}
              onOpenVideo={() => void handleOpenVideo()}
              onLoadedData={handleVideoLoad}
              onTimeUpdate={handleVideoTimeChange}
            />
          </div>
          <ControlsBar
            videoRef={videoRef}
            isPlaying={isPlaying}
            onPlay={playVideo}
            onPause={pauseVideo}
            onSeekDelta={seekDelta}
          />
        </div>

        {/* Right lightstick panel — resizable width */}
        <ResizePanel
          direction="left"
          defaultSize={{ width: 300, height: '100%' }}
          minWidth={240}
          maxWidth={300}
        >
          <LightstickPanel
            lightstickRef={lightstickRef}
            currentTime={currentTime}
            onLoadEffectFile={() => void loadColorsFile()}
          />
        </ResizePanel>
      </div>

      {/* Bottom timeline — resizable height */}
      <ResizePanel
        direction="top"
        defaultSize={{ width: '100%', height: 380 }}
        minHeight={200}
        maxHeight={420}
      >
        <TimelinePanel
          ref={timelineRef}
          effects={effects}
          videoDuration={videoDuration}
          currentTime={currentTime}
          waveform={waveform}
          onSeek={handleSeek}
        />
      </ResizePanel>
    </div>
  );
}
