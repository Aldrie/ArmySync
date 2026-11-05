import { useEffect, useState } from 'react';

import { cn } from '../../lib/cn';
import { formatClock } from '../look';
import { useRemoteStore } from '../store';

function Countdown({ until }: { until: number }) {
  const startsAt = useRemoteStore((s) => s.transport.songTime);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const lit = Math.min(3, Math.max(1, 4 - Math.ceil((until - now) / 1000)));

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-black/70 text-[#e5e2e1]">
      <span className="text-xs font-semibold tracking-[0.02em] text-[#cec3d0]">
        Syncing with the computer
      </span>
      <div
        role="img"
        aria-label={`${4 - lit} seconds left`}
        className="flex items-center gap-7 py-[18px]"
      >
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={cn(
              'size-[34px] rounded-full',
              dot <= lit
                ? 'bg-[#e1b6ff] shadow-[0_0_22px_rgba(225,182,255,0.6)]'
                : 'bg-[#1c1b1b] shadow-[inset_0_0_0_2px_#4b444e]',
            )}
          />
        ))}
      </div>
      <span className="text-[15px] font-semibold tabular-nums">
        Starts at {formatClock(startsAt)}
      </span>
      <span className="text-xs text-[#978e99]">
        You can touch the first pad now — it counts from the start
      </span>
      <button
        type="button"
        onClick={() => useRemoteStore.getState().pause()}
        className="pointer-events-auto mt-1.5 h-9 rounded-[9px] border border-white/12 bg-[#2a2a2a] px-4 text-[13px] font-medium text-[#e5e2e1]"
      >
        Cancel
      </button>
    </div>
  );
}

export default function CountdownOverlay() {
  const until = useRemoteStore((s) => s.countdownUntil);
  return until === null ? null : <Countdown key={until} until={until} />;
}
