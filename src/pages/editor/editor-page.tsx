import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { icons } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import ControlsBar from './components/controls-bar';
import EffectsSidebar from './components/effects-sidebar';
import LightstickPanel from './components/lightstick-panel';
import TimelinePanel from './components/timeline-panel';
import VideoArea from './components/video-area';
import ResizePanel from '../../components/resize-panel';
import type { EffectInstance } from '../../domains/effects';
import { getEffectDefinition } from '../../domains/effects';
import type { LightstickRef } from '../../domains/lightstick';
import { useKeybind } from '../../lib/use-keybind';
import { editorRefs } from '../../stores/editor-refs';
import { useEditorStore, generateEffectId } from '../../stores/editor-store';

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
  const addEffect = useEditorStore((s) => s.addEffect);
  const selectEffect = useEditorStore((s) => s.selectEffect);
  const copySelection = useEditorStore((s) => s.copySelection);
  const pasteSelection = useEditorStore((s) => s.pasteSelection);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection);

  const pointerPosRef = useRef({ x: 0, y: 0 });

  const handleDragEnd = useCallback(
    (event: {
      operation: {
        source?: { data?: Record<string, unknown> } | null;
        target?: { id: string | number } | null;
      };
      canceled: boolean;
    }) => {
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
      selectEffect(newEffect.id, 'replace');
    },
    [videoDuration, addEffect, selectEffect],
  );

  const handleDragMove = useCallback(
    (event: {
      operation: { position: { current: { x: number; y: number } } };
    }) => {
      pointerPosRef.current = event.operation.position.current;
    },
    [],
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
      }),
      [
        togglePlayPause,
        seekStep,
        adjustVolume,
        deleteSelection,
        copySelection,
        pasteSelection,
        duplicateSelection,
      ],
    ),
  );

  return (
    <DragDropProvider onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
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

        <DragOverlay>
          {(source) => {
            if (!source) return null;
            const effectType = source.data?.effectType as string | undefined;

            if (!effectType) return null;
            const def = getEffectDefinition(effectType);

            if (!def) return null;
            const Icon = icons[def.icon as keyof typeof icons];

            return (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-high border border-primary/40 shadow-lg">
                {Icon && <Icon className="size-3.5 text-primary" />}
                <span className="font-display font-bold text-xs text-on-surface">
                  {def.label}
                </span>
              </div>
            );
          }}
        </DragOverlay>
      </div>
    </DragDropProvider>
  );
}
