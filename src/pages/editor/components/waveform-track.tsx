import { useCallback, useEffect, useRef } from 'react';

interface WaveformTrackProps {
  waveform: Float32Array | null;
}

export default function WaveformTrack({ waveform }: WaveformTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!waveform || waveform.length === 0) return;

    const barWidth = 3;
    const gap = 1;
    const step = barWidth + gap;
    const visibleBars = Math.floor(rect.width / step);

    const style = getComputedStyle(canvas);
    const primary = style.getPropertyValue('color').trim() || '#e1b6ff';

    const samplesPerBar = waveform.length / visibleBars;

    for (let i = 0; i < visibleBars; i++) {
      const sampleIndex = Math.floor(i * samplesPerBar);
      const amplitude = waveform[Math.min(sampleIndex, waveform.length - 1)];

      const barHeight = Math.max(1, amplitude * rect.height * 0.9);
      const x = i * step;
      const y = rect.height - barHeight;

      ctx.fillStyle = primary;
      ctx.globalAlpha = 0.25 + amplitude * 0.55;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [1, 1, 0, 0]);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [waveform]);

  useEffect(() => {
    draw();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-12 text-primary"
      style={{ display: 'block' }}
    />
  );
}
