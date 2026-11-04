import { useDroppable } from '@dnd-kit/react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useRef, useMemo, useState } from 'react';

import TimelineEffectBlock from './timeline-effect-block';
import WaveformSkeleton from './waveform-skeleton';
import WaveformTrack from './waveform-track';
import Slider from '../../../components/slider';
import type { EffectInstance } from '../../../domains/effects';
import { cn } from '../../../lib/cn';
import * as format from '../../../lib/format';
import { useAppStore } from '../../../stores/app-store';
import { editorRefs } from '../../../stores/editor-refs';
import { useEditorStore } from '../../../stores/editor-store';
import { useTransientTime } from '../../../stores/use-transient-time';

const TIMELINE_DECREASE_FACTOR = 15;
const TIMELINE_MIN_SPOTS = 5;
const TIMELINE_MAX_SPOTS = 120;

interface TimelinePanelProps {
  effects: EffectInstance[];
  videoDuration: number;
  waveform: Float32Array | null;
  waveformLoading: boolean;
  onSeek: (timePercent: number) => void;
}

export default function TimelinePanel({
  effects,
  videoDuration,
  waveform,
  waveformLoading,
  onSeek,
}: TimelinePanelProps) {
  const [spotsCount, setSpotsCount] = useState(5);

  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const effectTrackRef = useRef<HTMLDivElement>(null);

  const selectEffect = useEditorStore((s) => s.selectEffect);
  const isDirty = useEditorStore((s) => s.isDirty);
  const projectName = useAppStore((s) => s.activeProject?.name);

  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: 'effect-track',
    accept: 'effect',
  });

  const trackRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      effectTrackRef.current = el;
      editorRefs.effectTrack = el;
      droppableRef(el);
    },
    [droppableRef],
  );

  useTransientTime((time) => {
    const duration = useEditorStore.getState().videoDuration || 1;
    const percent = ((time * 100) / duration).toFixed(2);

    if (needleRef.current) {
      needleRef.current.style.left = `${percent}%`;
    }
    if (timeRef.current) {
      timeRef.current.value = percent;
    }
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = format.videoTime(time);
    }
  });

  const timelineSpots = useMemo(() => {
    if (!videoDuration) return null;

    const percent = videoDuration / (spotsCount - 1);

    return Array.from({ length: spotsCount }, (_, index) => {
      const value = format.videoTime(percent * index);
      const isFirst = index === 0;
      const isLast = index === spotsCount - 1;

      return (
        <span
          key={index}
          className={cn(
            'relative h-2 text-[10px] font-medium text-outline tabular-nums',
            "after:content-[''] after:block after:absolute after:top-3.5",
            'after:left-0 after:right-0 after:mx-auto',
            'after:w-0 after:h-screen after:border-l after:border-border-strong after:border-dashed after:-z-1',
            isFirst && 'after:left-0 after:right-auto',
            isLast && 'after:right-0 after:left-auto',
          )}
        >
          {value}
        </span>
      );
    });
  }, [spotsCount, videoDuration]);

  const handleInputTimeChange = useCallback(
    (value: string) => {
      onSeek(Number(value));
      if (needleRef.current) {
        needleRef.current.style.left = `${value}%`;
      }
    },
    [onSeek],
  );

  const setZoomLevel = useEditorStore((s) => s.setZoomLevel);

  const handleZoomInputChange = useCallback(
    (value: number) => {
      const timeline = timelineRef.current;
      const container = timelineContainerRef.current;
      if (!timeline || !container) return;

      setZoomLevel(value);

      const oldWidth = timeline.scrollWidth;
      const needleRatio = needleRef.current
        ? parseFloat(needleRef.current.style.left || '0') / 100
        : 0;
      const needleOldX = needleRatio * oldWidth;
      const viewportOffset = needleOldX - container.scrollLeft;

      const timelinePercentageDelta =
        (videoDuration / TIMELINE_DECREASE_FACTOR) * 100 - 100;

      const newSpotsCount =
        Math.floor((value * TIMELINE_MAX_SPOTS) / 100) + TIMELINE_MIN_SPOTS;

      const timelinePercent = 100 + timelinePercentageDelta * (value / 100);
      timeline.style.width = `${timelinePercent}%`;

      const newWidth = timeline.scrollWidth;
      const needleNewX = needleRatio * newWidth;
      container.scrollLeft = needleNewX - viewportOffset;

      if (spotsCount !== newSpotsCount) {
        setSpotsCount(newSpotsCount);
      }
    },
    [setZoomLevel, spotsCount, videoDuration],
  );

  const handleTimelineWheel = useCallback((event: React.WheelEvent) => {
    if (!timelineContainerRef.current) return;
    timelineContainerRef.current.scrollTo({
      top: 0,
      left: timelineContainerRef.current.scrollLeft + event.deltaY,
    });
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== effectTrackRef.current) return;

      selectEffect(null);

      const track = effectTrackRef.current;
      if (!track || !videoDuration) return;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      onSeek(Math.max(0, Math.min(100, percent)));
    },
    [selectEffect, videoDuration, onSeek],
  );

  return (
    <div
      className="w-full h-full bg-surface-low border-t border-border select-none flex flex-col z-20 relative"
      onClick={() => selectEffect(null)}
    >
      <div className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-on-surface">
            {projectName || 'Untitled'}
          </span>
          {isDirty && (
            <span
              title="Unsaved changes"
              aria-label="Unsaved changes"
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
          )}
        </div>

        <span className="text-sm font-semibold text-on-surface tabular-nums">
          <span ref={timeDisplayRef}>{format.videoTime(0)}</span>
          <span className="font-medium text-outline">
            &nbsp;/&nbsp;
            {format.videoTime(videoDuration || 0)}
          </span>
        </span>

        <div className="flex items-center justify-end gap-2 text-on-surface-variant">
          <ZoomOut className="size-3.5" aria-hidden />
          <Slider
            min={0}
            max={100}
            step={0.1}
            defaultValue={0}
            aria-label="Timeline zoom"
            className="w-28"
            onChange={handleZoomInputChange}
          />
          <ZoomIn className="size-3.5" aria-hidden />
        </div>
      </div>

      <div
        ref={timelineContainerRef}
        className="px-4 w-full flex-1 overflow-x-auto overflow-y-hidden"
        onWheel={handleTimelineWheel}
      >
        <div ref={timelineRef} className="w-full h-full relative flex flex-col">
          <input
            type="range"
            className="range-timeline"
            min="0"
            max="100"
            step="0.01"
            ref={timeRef}
            onChange={(e) => handleInputTimeChange(e.target.value)}
          />

          <div className="w-full pt-2 pb-3 flex flex-col flex-1 min-h-0">
            <span
              ref={needleRef}
              className="absolute w-0.5 z-5 top-0 left-0 h-full bg-primary pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.25)] before:content-[''] before:block before:absolute before:top-0 before:bg-primary before:w-3 before:h-3.5 before:rounded-b-[5px] before:rounded-t-[2px] before:-translate-x-[5px]"
            />

            <div className="flex justify-between w-full mb-2">
              {timelineSpots}
            </div>

            <div
              ref={trackRefCallback}
              className={cn(
                'w-full h-16 shrink-0 bg-surface-dim rounded-lg relative z-4 overflow-visible ring-1 ring-inset ring-border transition-[background-color,box-shadow]',
                isDropTarget && 'bg-primary/5 ring-primary/50',
              )}
              onClick={handleTrackClick}
            >
              {effects.map((effect) => (
                <TimelineEffectBlock
                  key={effect.id}
                  effect={effect}
                  videoDuration={videoDuration}
                  containerRef={effectTrackRef}
                />
              ))}

              <div
                ref={(el) => {
                  editorRefs.effectTrackGhost = el;
                }}
                className="absolute h-full rounded-md border-2 border-dashed border-primary/60 pointer-events-none hidden"
                style={{ opacity: 0.4 }}
              />
            </div>

            <div className="w-full mt-3 flex-1 min-h-10">
              {waveformLoading ? (
                <WaveformSkeleton />
              ) : (
                <WaveformTrack waveform={waveform} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
