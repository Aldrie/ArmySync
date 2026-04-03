import { useEffect, useRef } from 'react';

import { getEffectDefinition } from '../../../domains/effects';

interface EffectPreviewCanvasProps {
  effectType: string;
  params: Record<string, unknown>;
}

export default function EffectPreviewCanvas({
  effectType,
  params,
}: EffectPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const definition = getEffectDefinition(effectType);
    if (!definition) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    definition.renderPreview(ctx, rect.width, rect.height, params);
  }, [effectType, params]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10 rounded-md border border-outline-variant"
    />
  );
}
