import { type RefObject, useCallback, useEffect, useRef } from 'react';

interface WaveformTrackProps {
  waveform: Float32Array | null;
  scrollRef: RefObject<HTMLDivElement | null>;
}

const BAR_WIDTH = 3;
const BAR_STEP = BAR_WIDTH + 1;

export default function WaveformTrack({
  waveform,
  scrollRef,
}: WaveformTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  // The track can be ~100x the viewport when zoomed in, so the canvas only covers the visible slice plus one viewport each side.
  const draw = useCallback(() => {
    frameRef.current = 0;
    const track = trackRef.current;
    const canvas = canvasRef.current;
    const scroller = scrollRef.current;
    if (!track || !canvas || !scroller) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const trackRect = track.getBoundingClientRect();
    const viewRect = scroller.getBoundingClientRect();
    const margin = viewRect.width;
    const start = Math.floor(
      Math.max(0, viewRect.left - trackRect.left - margin),
    );
    const end = Math.ceil(
      Math.min(trackRect.width, viewRect.right - trackRect.left + margin),
    );
    const width = Math.max(0, end - start);
    const height = trackRect.height;
    const dpr = window.devicePixelRatio || 1;

    canvas.style.left = `${start}px`;
    canvas.style.width = `${width}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!waveform || waveform.length === 0 || width === 0) return;

    const totalBars = Math.floor(trackRect.width / BAR_STEP);
    if (totalBars === 0) return;
    const samplesPerBar = waveform.length / totalBars;
    const primary =
      getComputedStyle(canvas).getPropertyValue('color').trim() || '#e1b6ff';
    ctx.fillStyle = primary;

    const first = Math.floor(start / BAR_STEP);
    const last = Math.min(totalBars, Math.ceil(end / BAR_STEP));
    for (let i = first; i < last; i++) {
      const amplitude =
        waveform[Math.min(Math.floor(i * samplesPerBar), waveform.length - 1)];
      const barHeight = Math.max(2, amplitude * height * 0.9);
      ctx.globalAlpha = 0.2 + amplitude * 0.45;
      ctx.beginPath();
      ctx.roundRect(
        i * BAR_STEP - start,
        (height - barHeight) / 2,
        BAR_WIDTH,
        barHeight,
        1.5,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [waveform, scrollRef]);

  useEffect(() => {
    const schedule = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(draw);
    };
    draw();

    const track = trackRef.current;
    const scroller = scrollRef.current;
    const observer = new ResizeObserver(schedule);
    if (track) observer.observe(track);
    if (scroller) observer.observe(scroller);
    scroller?.addEventListener('scroll', schedule, { passive: true });
    return () => {
      observer.disconnect();
      scroller?.removeEventListener('scroll', schedule);
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [draw, scrollRef]);

  return (
    <div ref={trackRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute top-0 h-full text-primary"
        style={{ display: 'block' }}
      />
    </div>
  );
}
