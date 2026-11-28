import { describe, expect, it } from 'vitest';
import { bingoTiles } from '@/content/bingo-tiles';
import { cardSquares, emptyMarks, FREE, isMarkable, shuffleTiles, TILE_COUNT } from './bingo';

describe('bingo tiles', () => {
  it('has exactly 24 tiles, all different', () => {
    expect(bingoTiles).toHaveLength(TILE_COUNT);
    expect(new Set(bingoTiles).size).toBe(TILE_COUNT);
  });
});

describe('shuffleTiles', () => {
  it('uses every tile index once', () => {
    for (let run = 0; run < 50; run++) {
      expect([...shuffleTiles()].sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    }
  });

  it('gives different layouts to different guests', () => {
    const layouts = new Set(Array.from({ length: 20 }, () => shuffleTiles().join(',')));
    expect(layouts.size).toBe(20);
  });

  it('is a fair Fisher-Yates swap from the end', () => {
    // pick always 0: each step swaps i with 0.
    expect(shuffleTiles(() => 0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0]);
    // pick the top of the range: nothing moves.
    expect(shuffleTiles((n) => n - 1)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });
});

describe('cardSquares', () => {
  it('puts the free square in the center and fills the rest in tile_order', () => {
    const tiles = Array.from({ length: 24 }, (_, i) => `t${i}`);
    const order = [...Array(24).keys()].reverse();
    const squares = cardSquares(order, tiles);
    expect(squares).toHaveLength(25);
    expect(squares[FREE]).toBeNull();
    expect(squares[0]).toBe('t23');
    expect(squares[11]).toBe('t12');
    expect(squares[13]).toBe('t11');
    expect(squares[24]).toBe('t0');
  });
});

describe('emptyMarks', () => {
  it('marks only the free center', () => {
    const marks = emptyMarks();
    expect(marks).toHaveLength(25);
    expect(marks.filter(Boolean)).toHaveLength(1);
    expect(marks[FREE]).toBe(true);
  });
});

describe('isMarkable', () => {
  it('takes 0 to 24 except the center', () => {
    expect(isMarkable(0)).toBe(true);
    expect(isMarkable(24)).toBe(true);
    expect(isMarkable(FREE)).toBe(false);
    expect(isMarkable(-1)).toBe(false);
    expect(isMarkable(25)).toBe(false);
    expect(isMarkable(1.5)).toBe(false);
    expect(isMarkable('3')).toBe(false);
  });
});
