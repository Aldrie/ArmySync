import { Play, Pause, Square, Diamond } from 'lucide-react';
import { useCallback, useRef, useMemo, useState } from 'react';

import { open } from '@tauri-apps/plugin-dialog';

import { EffectStrip, sync, effectFile } from '../../domains/effects';
import type { IEffect } from '../../domains/effects';
import { Lightstick } from '../../domains/lightstick';
import type { LightstickRef } from '../../domains/lightstick';
import * as format from '../../lib/format';
import { percentageOf } from '../../lib/math';

const TIMELINE_DECREASE_FACTOR = 15;
const TIMELINE_MIN_SPOTS = 5;
const TIMELINE_MAX_SPOTS = 120;

const DEV_VIDEO_PATH = '/example.mp4';

export default function EditorPage() {
  const [spotsCount, setSpotsCount] = useState(5);
  const [effects, setEffects] = useState<IEffect[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoSrc, setVideoSrc] = useState(
    import.meta.env.DEV ? DEV_VIDEO_PATH : '',
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const infoRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLInputElement>(null);
  const lightstickRef = useRef<LightstickRef>(null);

  const timelineSpots = useMemo(() => {
    if (!videoDuration) return null;

    const percent = videoDuration / (spotsCount - 1);
    return Array.from({ length: spotsCount }, (_, index) => {
      const value = format.videoTime(percent * index);
      return (
        <span
          key={index}
          className="relative h-2 text-xs font-bold text-white after:content-[''] after:block after:absolute after:top-3.5 after:left-0 after:right-0 after:mx-auto after:w-0.5 after:h-4 after:bg-white first:after:left-0 first:after:right-auto last:after:right-0 last:after:left-auto"
        >
          {value}
        </span>
      );
    });
  }, [spotsCount, videoDuration]);

  const playVideo = useCallback(() => {
    videoRef.current?.play();
  }, []);

  const pauseVideo = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const stopVideo = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  }, []);

  const handleInputTimeChange = useCallback((value: string) => {
    if (!videoRef.current || !needleRef.current) return;
    const videoTime = videoRef.current.duration * (Number(value) / 100);
    videoRef.current.currentTime = videoTime;
    needleRef.current.style.left = `${value}%`;
  }, []);

  const handleZoomInputChange = useCallback(
    (value: string) => {
      if (!videoRef.current || !zoomRef.current || !timelineRef.current) return;
      zoomRef.current.style.backgroundSize = `${value}% 100%`;

      const timelinePercentageDelta =
        (videoRef.current.duration / TIMELINE_DECREASE_FACTOR) * 100 - 100;

      const newSpotsCount =
        Math.floor((Number(value) * TIMELINE_MAX_SPOTS) / 100) +
        TIMELINE_MIN_SPOTS;

      const timelinePercent =
        100 + timelinePercentageDelta * (Number(value) / 100);
      timelineRef.current.style.width = `${timelinePercent}%`;

      if (spotsCount !== newSpotsCount) {
        setSpotsCount(newSpotsCount);
      }
    },
    [spotsCount],
  );

  const handleVideoTimeChange = useCallback(() => {
    if (
      !videoRef.current ||
      !needleRef.current ||
      !timeRef.current ||
      !infoRef.current
    )
      return;

    sync(effects, videoRef.current.currentTime, (color) =>
      lightstickRef.current?.setColor(color),
    );

    const videoPercent = (
      (videoRef.current.currentTime * 100) /
      videoRef.current.duration
    ).toFixed(2);

    timeRef.current.value = videoPercent;
    needleRef.current.style.left = `${videoPercent}%`;
    infoRef.current.innerText = format.videoTime(videoRef.current.currentTime);
  }, [effects]);

  const handleTimelineWheel = useCallback((event: React.WheelEvent) => {
    if (!timelineContainerRef.current) return;
    timelineContainerRef.current.scrollTo({
      top: 0,
      left: timelineContainerRef.current.scrollLeft + event.deltaY,
    });
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

  const handleVideoLoad = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  }, []);

  return (
    <div className="w-full h-full bg-surface grid gap-x-4 gap-y-[8%] p-6 grid-cols-[1fr_1fr_0.6fr_1fr] grid-rows-[1fr_1fr]">
      {/* Video area */}
      <div className="col-span-2 row-start-1 bg-black flex flex-col justify-center items-center relative rounded-lg">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-auto"
            onLoadedData={handleVideoLoad}
            onTimeUpdate={handleVideoTimeChange}
          />
        ) : (
          <button
            type="button"
            className="text-zinc-400 hover:text-white transition-colors text-sm cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2"
            onClick={() => void handleOpenVideo()}
          >
            Open Video File
          </button>
        )}
        <div className="absolute -bottom-8 w-full flex justify-center items-center gap-0.5">
          <Play
            size={22}
            fill="currentColor"
            className="cursor-pointer text-zinc-300 hover:text-white transition-colors mx-0.5"
            onClick={playVideo}
          />
          <Pause
            size={22}
            fill="currentColor"
            className="cursor-pointer text-zinc-300 hover:text-white transition-colors mx-0.5"
            onClick={pauseVideo}
          />
          <Square
            size={18}
            fill="currentColor"
            className="cursor-pointer text-zinc-300 hover:text-white transition-colors mx-0.5"
            onClick={stopVideo}
          />
        </div>
      </div>

      {/* Lightstick area */}
      <div className="col-start-3 row-start-1 flex justify-center items-end relative">
        <Lightstick ref={lightstickRef} />
        <div className="absolute right-0 top-1/10 h-4/5 w-0.5 bg-zinc-700 translate-x-2" />
      </div>

      {/* Effect controls area */}
      <div className="col-start-4 row-start-1 flex items-center justify-center">
        <button
          type="button"
          className="text-zinc-400 hover:text-white transition-colors text-sm cursor-pointer bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2"
          onClick={() => void loadColorsFile()}
        >
          Load Effect File
        </button>
      </div>

      {/* Timeline */}
      <div className="col-span-4 row-start-2 bg-surface-raised rounded-lg select-none flex flex-col">
        {/* Time info bar */}
        <div className="flex justify-end items-center px-3 pt-3 pb-1">
          <span className="text-xl font-bold text-zinc-200">
            <span ref={infoRef}>{format.videoTime(0)}</span>
            <span className="text-zinc-500">
              &nbsp;/&nbsp;
              {format.videoTime(videoDuration || 0)}
            </span>
          </span>
        </div>

        <div
          ref={timelineContainerRef}
          className="px-3 w-full flex-1 overflow-auto"
          onWheel={handleTimelineWheel}
        >
          <div ref={timelineRef} className="w-full h-full relative">
            {/* Range input for scrubbing */}
            <input
              type="range"
              className="range-timeline"
              min="0"
              max="100"
              step="0.01"
              ref={timeRef}
              onChange={(e) => handleInputTimeChange(e.target.value)}
            />

            {/* Line with spots */}
            <div className="w-full py-1.5 flex flex-wrap">
              {/* Needle */}
              <span
                ref={needleRef}
                className="absolute w-0.5 z-2 top-0 left-0 h-full bg-danger before:content-[''] before:block before:absolute before:bg-danger before:w-4 before:h-4 before:rounded-tl-xl before:rounded-tr-xl before:rounded-bl-none before:rounded-br-xl before:-translate-x-1.5 before:rotate-45"
              />

              {/* Time markers */}
              <div className="flex justify-between w-full mb-3">
                {timelineSpots}
              </div>

              {/* Track line */}
              <div className="w-full h-0.5 bg-white rounded-full" />
            </div>

            {/* Effect strips */}
            <div className="w-full h-1/2 absolute top-1/10 bottom-0 my-auto flex">
              {effects.map((effect, i) => {
                const duration = videoDuration || 1;
                const width = percentageOf(duration, effect.to - effect.from);
                const left = percentageOf(duration, effect.from);

                return (
                  <EffectStrip
                    key={i}
                    type={effect.type}
                    colors={effect.colors}
                    width={width}
                    left={left}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline footer */}
        <div className="w-full h-16 bg-surface-overlay flex justify-between items-center px-4 rounded-b-lg">
          <Diamond size={22} fill="currentColor" className="text-zinc-400" />
          <input
            type="range"
            className="range-zoom w-1/10 h-2 rounded-sm"
            min="0"
            max="100"
            step="0.1"
            defaultValue="0"
            ref={zoomRef}
            onChange={(e) => handleZoomInputChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
