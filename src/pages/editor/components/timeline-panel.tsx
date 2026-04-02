import { Diamond } from 'lucide-react';
import {
  useCallback,
  useRef,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';

import WaveformTrack from './waveform-track';
import Slider from '../../../components/slider';
import { EffectStrip } from '../../../domains/effects';
import type { IEffect } from '../../../domains/effects';
import * as format from '../../../lib/format';
import { percentageOf } from '../../../lib/math';

const TIMELINE_DECREASE_FACTOR = 15;
const TIMELINE_MIN_SPOTS = 5;
const TIMELINE_MAX_SPOTS = 120;

export interface TimelinePanelRef {
  updatePosition: (percent: number) => void;
}

interface TimelinePanelProps {
  effects: IEffect[];
  videoDuration: number;
  currentTime: number;
  waveform: Float32Array | null;
  onSeek: (timePercent: number) => void;
}

const TimelinePanel = forwardRef<TimelinePanelRef, TimelinePanelProps>(
  function TimelinePanel(
    { effects, videoDuration, currentTime, waveform, onSeek },
    ref,
  ) {
    const [spotsCount, setSpotsCount] = useState(5);

    const timelineRef = useRef<HTMLDivElement>(null);
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const needleRef = useRef<HTMLSpanElement>(null);
    const timeRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      updatePosition: (percent: number) => {
        if (needleRef.current) {
          needleRef.current.style.left = `${percent}%`;
        }
        if (timeRef.current) {
          timeRef.current.value = String(percent);
        }
      },
    }));

    const timelineSpots = useMemo(() => {
      if (!videoDuration) return null;

      const percent = videoDuration / (spotsCount - 1);

      return Array.from({ length: spotsCount }, (_, index) => {
        const value = format.videoTime(percent * index);

        return (
          <span
            key={index}
            className={`relative h-2 text-[10px] font-semibold text-on-surface-variant after:content-[''] after:block after:absolute after:top-3.5 after:left-0 after:right-0 after:mx-auto after:w-px after:h-screen after:border after:border-outline-variant after:border-dashed after:-z-1 first:after:left-0 first:after:right-auto last:after:right-0 last:after:left-auto ${index === 0 ? 'after:ml-2.5' : index === spotsCount - 1 ? 'after:mr-2.5' : ''}`}
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

    const handleZoomInputChange = useCallback(
      (value: number) => {
        if (!timelineRef.current) return;

        const timelinePercentageDelta =
          (videoDuration / TIMELINE_DECREASE_FACTOR) * 100 - 100;

        const newSpotsCount =
          Math.floor((value * TIMELINE_MAX_SPOTS) / 100) + TIMELINE_MIN_SPOTS;

        const timelinePercent = 100 + timelinePercentageDelta * (value / 100);
        timelineRef.current.style.width = `${timelinePercent}%`;

        if (spotsCount !== newSpotsCount) {
          setSpotsCount(newSpotsCount);
        }
      },
      [spotsCount, videoDuration],
    );

    const handleTimelineWheel = useCallback((event: React.WheelEvent) => {
      if (!timelineContainerRef.current) return;
      timelineContainerRef.current.scrollTo({
        top: 0,
        left: timelineContainerRef.current.scrollLeft + event.deltaY,
      });
    }, []);

    useEffect(() => {
      if (!needleRef.current || !videoDuration) return;
      const percent = ((currentTime * 100) / videoDuration).toFixed(2);
      needleRef.current.style.left = `${percent}%`;
    }, [currentTime, videoDuration]);

    return (
      <div className="w-full h-full bg-surface-low select-none flex flex-col z-20 relative">
        {/* Time info bar */}
        <div className="flex justify-between items-center px-4 pt-3 pb-1 ml-auto">
          <span className="font-bold text-on-surface tabular-nums">
            {format.videoTime(currentTime)}
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
          <div
            ref={timelineRef}
            className="w-full h-full relative flex flex-col"
          >
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

            <div className="w-full py-1.5 flex flex-wrap flex-1">
              {/* Needle */}
              <span
                ref={needleRef}
                className="absolute w-0.5 z-2 top-0 left-0 h-full bg-primary before:content-[''] before:block before:absolute before:bg-primary before:w-3 before:h-3 before:rounded-full before:-translate-x-[5px]"
              />

              {/* Time markers */}
              <div className="flex justify-between w-full mb-2">
                {timelineSpots}
              </div>

              {/* COLOR SYNC track */}
              <div className="w-full relative">
                <div className="w-full h-8 bg-surface-dim rounded-md relative overflow-hidden">
                  {effects.map((effect, i) => {
                    const duration = videoDuration || 1;
                    const width = percentageOf(
                      duration,
                      effect.to - effect.from,
                    );
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

              {/* Waveform track */}
              <div className="w-full mt-auto">
                <WaveformTrack waveform={waveform} />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline footer */}
        <div className="w-full h-12 bg-surface-container flex justify-between items-center px-4">
          <Diamond size={16} className="text-on-surface-variant" />
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
  },
);

export default TimelinePanel;
