export const videoTime = (currentSeconds: number) => {
  const hours = Math.floor(currentSeconds / (60 * 60));
  const minutes = Math.floor(currentSeconds / 60) % 60;
  const seconds = Math.floor(currentSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${hours ? `${hours}:${pad(minutes)}` : minutes}:${pad(seconds)}`;
};

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
