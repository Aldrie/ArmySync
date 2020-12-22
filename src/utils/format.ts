export const videoTime = (currentSeconds: number) => {
  const hours = Math.floor(currentSeconds / (60 * 60));
  const minutes = Math.floor(currentSeconds / 60);
  const seconds = Math.floor(currentSeconds % 60);

  return `${hours ? `${hours}:` : ''}${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
};
