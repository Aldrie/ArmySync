export const percentageOf = (total: number, piece: number) =>
  (piece * 100) / total;

export const lerp = (a: number, b: number, u: number) => (1 - u) * a + u * b;
