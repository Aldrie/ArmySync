import { useCallback, useRef, useState } from 'react';

import { getEffectDefinition } from '../../../domains/effects';
import type { EffectInstance } from '../../../domains/effects';
import {
  findSnapTarget,
  resolveOverlap,
} from '../../../domains/effects/services/timeline';
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
  const selectedEffectIds = useEditorStore((s) => s.selectedEffectIds);
  const selectEffect = useEditorStore((s) => s.selectEffect);
  const moveEffect = useEditorStore((s) => s.moveEffect);
  const moveEffects = useEditorStore((s) => s.moveEffects);
  const resizeEffect = useEditorStore((s) => s.resizeEffect);
  const effects = useEditorStore((s) => s.effects);

  const isSelected = selectedEffectIds.includes(effect.id);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    origFrom: number;
    origTo: number;
    groupOrigins: Array<{ id: string; from: number; to: number }>;
    moved: boolean;
    deferredSelect: boolean;
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

      useEditorStore.getState().pushHistory();

      const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey;
      let deferredSelect = false;

      if (hasModifier) {
        const selectMode = e.shiftKey ? 'range' : 'toggle';
        selectEffect(effect.id, selectMode);
      } else if (!isSelected) {
        selectEffect(effect.id, 'replace');
      } else {
        deferredSelect = true;
      }

      const currentEffects = useEditorStore.getState().effects;
      const currentSelected = useEditorStore.getState().selectedEffectIds;

      const groupOrigins =
        mode === 'move' && currentSelected.length > 1
          ? currentEffects
              .filter((e) => currentSelected.includes(e.id))
              .map((e) => ({ id: e.id, from: e.from, to: e.to }))
          : [];

      setIsDragging(true);
      dragRef.current = {
        mode,
        startX: e.clientX,
        origFrom: effect.from,
        origTo: effect.to,
        groupOrigins,
        moved: false,
        deferredSelect,
      };
    },
    [effect.id, effect.from, effect.to, isSelected, selectEffect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      drag.moved = true;

      const currentTime = getTimeFromClientX(e.clientX);
      const startTime = getTimeFromClientX(drag.startX);
      const delta = currentTime - startTime;

      const container = containerRef.current;
      const containerWidth = container?.scrollWidth ?? 1;

      if (drag.mode === 'move') {
        if (drag.groupOrigins.length > 1) {
          const groupMin = Math.min(...drag.groupOrigins.map((g) => g.from));
          const groupMax = Math.max(...drag.groupOrigins.map((g) => g.to));

          let clampedDelta = delta;
          if (groupMin + clampedDelta < 0) clampedDelta = -groupMin;
          if (groupMax + clampedDelta > videoDuration)
            clampedDelta = videoDuration - groupMax;

          const selectedIds = new Set(drag.groupOrigins.map((g) => g.id));
          const snappedDelta =
            findSnapTarget(
              drag.origFrom + clampedDelta,
              effects,
              containerWidth,
              videoDuration,
              effect.id,
              selectedIds,
            ) - drag.origFrom;

          const finalDelta =
            groupMin + snappedDelta >= 0 &&
            groupMax + snappedDelta <= videoDuration
              ? snappedDelta
              : clampedDelta;

          moveEffects(
            drag.groupOrigins.map((g) => ({
              id: g.id,
              from: g.from + finalDelta,
              to: g.to + finalDelta,
            })),
          );
        } else {
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
        }
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
      moveEffects,
      resizeEffect,
    ],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const drag = dragRef.current;
      if (drag) {
        if (drag.deferredSelect && !drag.moved) {
          selectEffect(effect.id, 'replace');
        }

        if (drag.moved) {
          const currentEffects = useEditorStore.getState().effects;

          if (drag.groupOrigins.length > 1) {
            const movedIds = new Set(drag.groupOrigins.map((g) => g.id));
            const moves: Array<{ id: string; from: number; to: number }> = [];

            for (const id of movedIds) {
              const eff = currentEffects.find((e) => e.id === id);
              if (!eff) continue;
              const resolved = resolveOverlap(
                eff,
                currentEffects,
                videoDuration,
                movedIds,
              );
              if (resolved) moves.push({ id, ...resolved });
            }

            if (moves.length > 0) moveEffects(moves);
          } else {
            const resolved = resolveOverlap(
              effect,
              currentEffects,
              videoDuration,
            );
            if (resolved) moveEffect(effect.id, resolved.from, resolved.to);
          }
        }
      }

      setIsDragging(false);
      dragRef.current = null;
    },
    [effect, videoDuration, moveEffect, moveEffects, selectEffect],
  );

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
          'z-2 ring-2 ring-primary ring-offset-1 ring-offset-surface-dim',
        isDragging && 'z-3 ring-2 ring-primary/60 ring-dashed opacity-80',
      )}
      style={{
        width: `${width}%`,
        left: `${left}%`,
        background,
      }}
      onClick={(e) => e.stopPropagation()}
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
