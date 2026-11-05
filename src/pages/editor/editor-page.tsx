import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { icons } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { listen } from '@tauri-apps/api/event';

import ControlsBar from './components/controls-bar';
import EffectsSidebar from './components/effects-sidebar';
import LightstickPanel from './components/lightstick-panel';
import TimelinePanel from './components/timeline-panel';
import VideoArea from './components/video-area';
import DevicesModal from '../../components/devices-modal';
import ResizePanel from '../../components/resize-panel';
import type { EffectInstance } from '../../domains/effects';
import { getEffectDefinition } from '../../domains/effects';
import { findSnapTarget } from '../../domains/effects/services/timeline';
import type { LightstickRef } from '../../domains/lightstick';
import { useKeybind } from '../../lib/use-keybind';
import { useAppStore } from '../../stores/app-store';
import { editorRefs } from '../../stores/editor-refs';
import { useEditorStore, generateEffectId } from '../../stores/editor-store';

function snapDropTime(x: number, width: number, duration: number): number {
  const { effects, currentTime } = useEditorStore.getState();
  return findSnapTarget(
    Math.max(0, (x / width) * duration),
    effects,
    width,
    duration,
    undefined,
    undefined,
    [currentTime],
  );
}

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

  const activeProjectId = useAppStore((s) => s.activeProject?.id);
  const initFromProject = useEditorStore((s) => s.initFromProject);

  useEffect(() => {
    const project = useAppStore.getState().activeProject;
    if (project) void initFromProject(project);
  }, [activeProjectId, initFromProject]);

  useEffect(() => {
    const unlisten = listen<{ color: string }>('color-update', (event) => {
      lightstickRef.current?.setColor(event.payload.color);
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

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
  const addEffect = useEditorStore((s) => s.addEffect);
  const selectEffect = useEditorStore((s) => s.selectEffect);
  const copySelection = useEditorStore((s) => s.copySelection);
  const pasteSelection = useEditorStore((s) => s.pasteSelection);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const saveEffects = useEditorStore((s) => s.saveEffects);

  const pointerPosRef = useRef({ x: 0, y: 0 });

  const handleDragEnd = useCallback(
    (event: {
      operation: {
        source?: { data?: Record<string, unknown> } | null;
        target?: { id: string | number } | null;
      };
      canceled: boolean;
    }) => {
      editorRefs.effectTrackGhost?.classList.add('hidden');

      if (event.canceled) return;

      const { source, target } = event.operation;
      if (!source || !target || target.id !== 'effect-track') return;

      const effectType = source.data?.effectType as string | undefined;
      if (!effectType || !videoDuration) return;

      const definition = getEffectDefinition(effectType);
      if (!definition) return;

      const trackEl = editorRefs.effectTrack;
      if (!trackEl) return;

      const rect = trackEl.getBoundingClientRect();
      const x = pointerPosRef.current.x - rect.left;
      const dropTime = snapDropTime(x, rect.width, videoDuration);

      const duration = definition.defaultDuration;
      const from = dropTime;
      const to = Math.min(from + duration, videoDuration);

      const params: Record<string, unknown> = {};

      for (const field of definition.fields) {
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
      selectEffect(newEffect.id, 'replace');
    },
    [videoDuration, addEffect, selectEffect],
  );

  const handleDragMove = useCallback(
    (event: {
      operation: {
        position: { current: { x: number; y: number } };
        source?: { data?: Record<string, unknown> } | null;
      };
    }) => {
      const pos = event.operation.position.current;
      pointerPosRef.current = pos;

      const ghost = editorRefs.effectTrackGhost;
      const track = editorRefs.effectTrack;
      if (!ghost || !track) return;

      const effectType = event.operation.source?.data?.effectType as
        | string
        | undefined;
      if (!effectType || !videoDuration) {
        ghost.classList.add('hidden');
        return;
      }

      const rect = track.getBoundingClientRect();
      const isOver =
        pos.x >= rect.left &&
        pos.x <= rect.right &&
        pos.y >= rect.top &&
        pos.y <= rect.bottom;

      if (!isOver) {
        ghost.classList.add('hidden');
        return;
      }

      const def = getEffectDefinition(effectType);
      if (!def) return;

      const x = pos.x - rect.left;
      const dropTime = snapDropTime(x, rect.width, videoDuration);
      const endTime = Math.min(dropTime + def.defaultDuration, videoDuration);

      ghost.style.left = `${(dropTime / videoDuration) * 100}%`;
      ghost.style.width = `${((endTime - dropTime) / videoDuration) * 100}%`;

      const params: Record<string, unknown> = {};
      for (const field of def.fields) params[field.key] = field.default;
      ghost.style.background = def.buildStripBackground(params);

      ghost.classList.remove('hidden');
    },
    [videoDuration],
  );

  useKeybind(
    useMemo(
      () => ({
        Space: () => togglePlayPause(),
        ArrowLeft: (e) => seekStep(-1, e.shiftKey),
        ArrowRight: (e) => seekStep(1, e.shiftKey),
        ArrowUp: () => adjustVolume(0.05),
        ArrowDown: () => adjustVolume(-0.05),
        Delete: () => deleteSelection(),
        Backspace: () => deleteSelection(),
        KeyC: (e) => {
          if (e.metaKey || e.ctrlKey) copySelection();
        },
        KeyV: (e) => {
          if (e.metaKey || e.ctrlKey) pasteSelection();
        },
        KeyD: (e) => {
          if (e.metaKey || e.ctrlKey) duplicateSelection();
        },
        KeyZ: (e) => {
          if (e.metaKey || e.ctrlKey) {
            if (e.shiftKey) redo();
            else undo();
          }
        },
        KeyS: (e) => {
          if (e.metaKey || e.ctrlKey) void saveEffects();
        },
      }),
      [
        togglePlayPause,
        seekStep,
        adjustVolume,
        deleteSelection,
        copySelection,
        pasteSelection,
        duplicateSelection,
        undo,
        redo,
        saveEffects,
      ],
    ),
  );

  return (
    <DragDropProvider onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div className="flex flex-col w-full h-full bg-surface-dim overflow-hidden">
        <div className="flex flex-1 min-h-0">
          <ResizePanel
            direction="right"
            defaultSize={{ width: 360, height: '100%' }}
            minWidth={280}
            maxWidth={420}
          >
            <EffectsSidebar />
          </ResizePanel>

          <div className="flex flex-col flex-1 min-w-0 bg-surface">
            <div className="flex-1 min-h-0 px-4 pt-4">
              <VideoArea
                videoRef={videoRef}
                videoSrc={videoSrc}
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
            <LightstickPanel lightstickRef={lightstickRef} />
          </ResizePanel>
        </div>

        <ResizePanel
          direction="top"
          defaultSize={{ width: '100%', height: 228 }}
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

        <DragOverlay dropAnimation={null}>
          {(source) => {
            if (!source) return null;
            const effectType = source.data?.effectType as string | undefined;

            if (!effectType) return null;
            const def = getEffectDefinition(effectType);

            if (!def) return null;
            const Icon = icons[def.icon as keyof typeof icons];

            return (
              <div className="flex w-64 items-center gap-3 p-2.5 rounded-lg bg-surface-highest border border-primary/50 shadow-popover cursor-grabbing">
                {Icon && (
                  <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="block font-medium text-[13px] leading-tight text-on-surface">
                    {def.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-on-surface-variant truncate">
                    {def.description}
                  </span>
                </div>
              </div>
            );
          }}
        </DragOverlay>
      </div>

      <DevicesModal />
    </DragDropProvider>
  );
}
