import { useCallback, useRef } from 'react';

import { getEffectDefinition } from '../../../domains/effects';
import type { EffectInstance } from '../../../domains/effects';
import { findSnapTarget } from '../../../domains/effects/services/timeline';
import { cn } from '../../../lib/cn';
import { percentageOf } from '../../../lib/math';
import { useEditorStore } from '../../../stores/editor-store';

interface TimelineEffectBlockProps {
  effect: EffectInstance;
  videoDuration: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';

export default function TimelineEffectBlock({
  effect,
  videoDuration,
  containerRef,
}: TimelineEffectBlockProps) {
  const selectedEffectId = useEditorStore((s) => s.selectedEffectId);
  const selectEffect = useEditorStore((s) => s.selectEffect);
  const moveEffect = useEditorStore((s) => s.moveEffect);
  const resizeEffect = useEditorStore((s) => s.resizeEffect);
  const effects = useEditorStore((s) => s.effects);

  const isSelected = selectedEffectId === effect.id;

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    origFrom: number;
    origTo: number;
  } | null>(null);

  const getTimeFromClientX = useCallback(
    (clientX: number): number => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left + container.scrollLeft;
      return Math.max(
        0,
        Math.min(videoDuration, (x / container.scrollWidth) * videoDuration),
      );
    },
    [containerRef, videoDuration],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      selectEffect(effect.id);

      dragRef.current = {
        mode,
        startX: e.clientX,
        origFrom: effect.from,
        origTo: effect.to,
      };
    },
    [effect.id, effect.from, effect.to, selectEffect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const currentTime = getTimeFromClientX(e.clientX);
      const startTime = getTimeFromClientX(drag.startX);
      const delta = currentTime - startTime;

      const container = containerRef.current;
      const containerWidth = container?.scrollWidth ?? 1;

      if (drag.mode === 'move') {
        const duration = drag.origTo - drag.origFrom;
        let newFrom = drag.origFrom + delta;
        let newTo = newFrom + duration;

        if (newFrom < 0) {
          newFrom = 0;
          newTo = duration;
        }
        if (newTo > videoDuration) {
          newTo = videoDuration;
          newFrom = videoDuration - duration;
        }

        const snappedFrom = findSnapTarget(
          newFrom,
          effects,
          containerWidth,
          videoDuration,
          effect.id,
        );
        if (snappedFrom !== newFrom) {
          newFrom = snappedFrom;
          newTo = snappedFrom + duration;
        }

        moveEffect(effect.id, newFrom, newTo);
      } else if (drag.mode === 'resize-start') {
        let newFrom = findSnapTarget(
          drag.origFrom + delta,
          effects,
          containerWidth,
          videoDuration,
          effect.id,
        );
        newFrom = Math.max(0, Math.min(newFrom, drag.origTo - 0.1));
        resizeEffect(effect.id, 'start', newFrom);
      } else if (drag.mode === 'resize-end') {
        let newTo = findSnapTarget(
          drag.origTo + delta,
          effects,
          containerWidth,
          videoDuration,
          effect.id,
        );
        newTo = Math.max(drag.origFrom + 0.1, Math.min(newTo, videoDuration));
        resizeEffect(effect.id, 'end', newTo);
      }
    },
    [
      getTimeFromClientX,
      containerRef,
      effects,
      effect.id,
      videoDuration,
      moveEffect,
      resizeEffect,
    ],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }, []);

  const definition = getEffectDefinition(effect.type);
  const background = definition
    ? definition.buildStripBackground(effect.params)
    : 'transparent';

  const width = percentageOf(videoDuration || 1, effect.to - effect.from);
  const left = percentageOf(videoDuration || 1, effect.from);

  return (
    <div
      className={cn(
        'group/block absolute h-full rounded-md cursor-grab active:cursor-grabbing transition-shadow hover:opacity-90',
        isSelected &&
          'ring-2 ring-primary ring-offset-1 ring-offset-surface-dim',
      )}
      style={{
        width: `${width}%`,
        left: `${left}%`,
        background,
      }}
      onPointerDown={(e) => handlePointerDown(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="absolute -left-1 top-0 w-2.5 h-full cursor-w-resize rounded-l-md transition-colors group/handle"
        onPointerDown={(e) => handlePointerDown(e, 'resize-start')}
      >
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary/0 group-hover/block:bg-primary/30 group-hover/handle:bg-primary transition-colors" />
      </div>
      <div
        className="absolute -right-1 top-0 w-2.5 h-full cursor-e-resize rounded-r-md transition-colors group/handle"
        onPointerDown={(e) => handlePointerDown(e, 'resize-end')}
      >
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary/0 group-hover/block:bg-primary/30 group-hover/handle:bg-primary transition-colors" />
      </div>

      {width > 3 && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/70 pointer-events-none truncate px-2 drop-shadow-sm">
          {definition?.label}
        </span>
      )}
    </div>
  );
}
