import { Diamond } from 'lucide-react';
import { useCallback, useRef, useMemo, useState } from 'react';

import { draggingEffectType } from './effect-palette';
import TimelineEffectBlock from './timeline-effect-block';
import WaveformSkeleton from './waveform-skeleton';
import WaveformTrack from './waveform-track';
import Slider from '../../../components/slider';
import type { EffectInstance } from '../../../domains/effects';
import { getEffectDefinition } from '../../../domains/effects';
import { cn } from '../../../lib/cn';
import * as format from '../../../lib/format';
import { useEditorStore, generateEffectId } from '../../../stores/editor-store';
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
  const [dragPreview, setDragPreview] = useState<{
    left: number;
    width: number;
    background: string;
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const effectTrackRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const addEffect = useEditorStore((s) => s.addEffect);
  const selectEffect = useEditorStore((s) => s.selectEffect);

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
            'relative h-2 text-[10px] font-semibold text-on-surface-variant',
            "after:content-[''] after:block after:absolute after:top-3.5",
            'after:left-0 after:right-0 after:mx-auto',
            'after:w-px after:h-screen after:border after:border-outline-variant after:border-dashed after:-z-1',
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

  // -------------------------------------------------------------------------
  // Drag-and-drop from palette
  // -------------------------------------------------------------------------

  const calcPreview = useCallback(
    (e: React.DragEvent, effectType: string) => {
      const track = effectTrackRef.current;
      if (!track || !videoDuration) return null;

      const definition = getEffectDefinition(effectType);
      if (!definition) return null;

      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const dropTime = Math.max(0, (x / rect.width) * videoDuration);
      const duration = definition.defaultDuration;
      const endTime = Math.min(dropTime + duration, videoDuration);

      const leftPct = (dropTime / videoDuration) * 100;
      const widthPct = ((endTime - dropTime) / videoDuration) * 100;

      const params: Record<string, unknown> = {};
      for (const field of definition.uiConfig) {
        params[field.key] = field.default;
      }

      return {
        left: leftPct,
        width: widthPct,
        background: definition.buildStripBackground(params),
      };
    },
    [videoDuration],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!draggingEffectType) return;
    e.preventDefault();
    dragCounterRef.current++;
    if (timeRef.current) timeRef.current.style.pointerEvents = 'none';
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!draggingEffectType) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      const preview = calcPreview(e, draggingEffectType);
      if (preview) setDragPreview(preview);
    },
    [calcPreview],
  );

  const handleDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragPreview(null);
      if (timeRef.current) timeRef.current.style.pointerEvents = '';
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setDragPreview(null);
      if (timeRef.current) timeRef.current.style.pointerEvents = '';

      const effectType = e.dataTransfer.getData('application/effect-type');
      if (!effectType || !videoDuration) return;

      const definition = getEffectDefinition(effectType);
      if (!definition) return;

      const track = effectTrackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const dropTime = Math.max(0, (x / rect.width) * videoDuration);

      const duration = definition.defaultDuration;
      const from = dropTime;
      const to = Math.min(from + duration, videoDuration);

      const params: Record<string, unknown> = {};
      for (const field of definition.uiConfig) {
        params[field.key] = field.default;
      }

      const newEffect: EffectInstance = {
        id: generateEffectId(),
        type: effectType,
        from,
        to,
        params,
      };

      addEffect(newEffect);
      selectEffect(newEffect.id);
    },
    [videoDuration, addEffect, selectEffect],
  );

  // Deselect when clicking empty area
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === effectTrackRef.current) {
        selectEffect(null);
      }
    },
    [selectEffect],
  );

  return (
    <div
      className="w-full h-full bg-surface-low select-none flex flex-col z-20 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center px-4 pt-3 pb-1 ml-auto">
        <span className="font-bold text-on-surface tabular-nums">
          <span ref={timeDisplayRef}>{format.videoTime(0)}</span>
          <span className="text-on-surface-variant">
            &nbsp;/&nbsp;
            {format.videoTime(videoDuration || 0)}
          </span>
        </span>
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

          <div className="w-full py-1.5 flex flex-wrap flex-1">
            <span
              ref={needleRef}
              className="absolute w-0.5 z-2 top-0 left-0 h-full bg-primary before:content-[''] before:block before:absolute before:bg-primary before:w-3 before:h-3 before:rounded-full before:-translate-x-[5px]"
            />

            <div className="flex justify-between w-full mb-2">
              {timelineSpots}
            </div>

            <div
              ref={effectTrackRef}
              className={cn(
                'w-full h-8 bg-surface-dim rounded-md relative overflow-visible transition-colors',
                dragPreview && 'bg-surface-high ring-1 ring-primary/40',
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

              {/* Ghost preview while dragging from palette */}
              {dragPreview && (
                <div
                  className="absolute h-full rounded-md border-2 border-dashed border-primary/60 pointer-events-none"
                  style={{
                    left: `${dragPreview.left}%`,
                    width: `${dragPreview.width}%`,
                    background: dragPreview.background,
                    opacity: 0.4,
                  }}
                />
              )}
            </div>

            <div className="w-full mt-auto">
              {waveformLoading ? (
                <WaveformSkeleton />
              ) : (
                <WaveformTrack waveform={waveform} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-12 bg-surface-container flex justify-between items-center px-4">
        <Diamond className="size-4 text-on-surface-variant" />
        <Slider
          min={0}
          max={100}
          step={0.1}
          defaultValue={0}
          variant="zoom"
          className="w-24 h-2 rounded-sm"
          onChange={handleZoomInputChange}
        />
      </div>
    </div>
  );
}
