import { randomInt } from 'node:crypto';

// A card is 5x5, positions 0 to 24 row by row. The center is the free square, always marked.
export const SIZE = 25;
export const FREE = 12;
export const TILE_COUNT = SIZE - 1;

// A fresh shuffle of the tile indexes 0 to 23 (Fisher-Yates). `pick(n)` returns 0 to n - 1.
export function shuffleTiles(pick: (n: number) => number = randomInt): number[] {
  const order = Array.from({ length: TILE_COUNT }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Nothing marked but the free center.
export function emptyMarks(): boolean[] {
  return Array.from({ length: SIZE }, (_, i) => i === FREE);
}

// The 25 squares of a card: tile text by position, null for the free center.
// tile_order fills the 24 other positions in order, skipping the center.
export function cardSquares(tileOrder: number[], tiles: string[]): (string | null)[] {
  const rest = [...tileOrder];
  return Array.from({ length: SIZE }, (_, i) => (i === FREE ? null : tiles[rest.shift()!]));
}

// A position a guest may tap: a whole number on the card, not the free center.
export function isMarkable(position: unknown): position is number {
  return Number.isInteger(position) && (position as number) >= 0 && (position as number) < SIZE && position !== FREE;
}
