import { useMemo } from 'react';

const BAR_COUNT = 120;
const MIN_HEIGHT = 10;
const MAX_HEIGHT = 90;

function generateBars(): number[] {
  return Array.from({ length: BAR_COUNT }, () =>
    Math.floor(Math.random() * (MAX_HEIGHT - MIN_HEIGHT) + MIN_HEIGHT),
  );
}

export default function WaveformSkeleton() {
  const bars = useMemo(() => generateBars(), []);

  return (
    <div className="w-full h-12 flex items-end gap-px">
      {bars.map((height, i) => (
        <div
          key={i}
          className="bg-shimmer-vertical animate-shimmer-y flex-1 rounded-t-sm"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}
