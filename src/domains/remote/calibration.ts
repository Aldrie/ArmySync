export const clampLatency = (ms: number) => Math.max(-500, Math.min(500, ms));

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeLatency(
  clicks: number[],
  taps: number[],
): { latencyMs: number; spreadMs: number; count: number } | null {
  if (clicks.length < 2) return null;
  const half =
    (clicks[clicks.length - 1] - clicks[0]) / (clicks.length - 1) / 2;

  const offsets = taps
    .map((tap) =>
      clicks.reduce((best, click) =>
        Math.abs(tap - click) < Math.abs(tap - best) ? click : best,
      ),
    )
    .map((click, i) => taps[i] - click)
    .filter((offset) => Math.abs(offset) < half);
  if (offsets.length < 4) return null;

  const latencyMs = median(offsets);
  return {
    latencyMs,
    spreadMs: median(offsets.map((o) => Math.abs(o - latencyMs))),
    count: offsets.length,
  };
}
