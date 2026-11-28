import { describe, expect, it } from 'vitest';
import { anytime, stops } from '../content/crawl';
import { crawlRows } from './crawl-rows';

describe('crawlRows', () => {
  it('loads the content: stops in order, anytime challenges with no stop', () => {
    const rows = crawlRows(stops, anytime);
    expect(rows.stops.map((s) => [s.id, s.sort])).toEqual(stops.map((s, i) => [s.id, i]));
    expect(rows.challenges.filter((c) => c.stop_id === null).map((c) => c.id)).toEqual(anytime.map((c) => c.id));
  });

  it('stores 3 points for a placement challenge (1st place)', () => {
    const rows = crawlRows([{ id: 's', name: 'S', address: 'A', challenges: [{ id: 'p', title: 'P', kind: 'placement' }] }], []);
    expect(rows.challenges[0]).toMatchObject({ id: 'p', stop_id: 's', sort: 0, points: 3, kind: 'placement' });
  });

  it('refuses an award challenge with no points', () => {
    expect(() => crawlRows([], [{ id: 'x', title: 'X', kind: 'award' }])).toThrow("x: an 'award' challenge needs whole points above 0");
    expect(() => crawlRows([], [{ id: 'x', title: 'X', kind: 'award', points: 1.5 }])).toThrow();
  });

  it('refuses a duplicate id across stops and challenges', () => {
    expect(() =>
      crawlRows([{ id: 'dup', name: 'S', address: 'A', challenges: [] }], [{ id: 'dup', title: 'X', kind: 'award', points: 1 }]),
    ).toThrow("Duplicate crawl id 'dup'");
  });
});
