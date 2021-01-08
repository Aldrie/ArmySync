export const percentageOf = (number: number, piece: number) => (piece * 100) / number;

export const lerp = (a: number, b: number, u: number) => (1 - u) * a + u * b;
