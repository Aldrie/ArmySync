export const videoTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return `${minutes}:${seconds.toString().length === 1 ? `${seconds}0` : seconds}`;
};
