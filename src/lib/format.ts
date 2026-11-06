export const videoTime = (currentSeconds: number) => {
  const hours = Math.floor(currentSeconds / (60 * 60));
  const minutes = Math.floor(currentSeconds / 60) % 60;
  const seconds = Math.floor(currentSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${hours ? `${hours}:${pad(minutes)}` : minutes}:${pad(seconds)}`;
};

export function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
