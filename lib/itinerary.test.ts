import { describe, expect, it } from 'vitest';
import type { Card } from '../content/itinerary';
import { currentCardIndex, mapUrl } from './itinerary';
import { pacificToUtc } from './time';

const cards: Card[] = [
  { day: 'fri', title: 'Dinner', start: '2026-12-18T19:00', end: '2026-12-18T21:30', tag: 'Dinner' },
  { day: 'fri', title: 'Crawl', start: '2026-12-18T21:30', tag: 'Crawl' }, // No end.
  { day: 'sat', title: 'Topgolf', tag: 'Topgolf' }, // TBD.
  { day: 'sat', title: 'Airsoft', start: '2026-12-19T20:30', end: '2026-12-19T22:30', tag: 'Airsoft' },
];
const at = (local: string) => pacificToUtc(local);

describe('currentCardIndex', () => {
  it('finds nothing before the first card', () => {
    expect(currentCardIndex(cards, at('2026-12-18T18:59'))).toBe(-1);
  });

  it('includes the start and excludes the end', () => {
    expect(currentCardIndex(cards, at('2026-12-18T19:00'))).toBe(0);
    expect(currentCardIndex(cards, at('2026-12-18T21:29'))).toBe(0);
    expect(currentCardIndex(cards, at('2026-12-18T21:30'))).toBe(1);
  });

  it('keeps a card with no end as now until the next card starts', () => {
    expect(currentCardIndex(cards, at('2026-12-19T15:00'))).toBe(1);
    expect(currentCardIndex(cards, at('2026-12-19T20:30'))).toBe(3);
  });

  it('never marks a TBD card', () => {
    for (const t of ['2026-12-19T12:00', '2026-12-19T16:00']) {
      expect(currentCardIndex(cards, at(t))).not.toBe(2);
    }
  });

  it('finds nothing after the last end', () => {
    expect(currentCardIndex(cards, at('2026-12-19T22:30'))).toBe(-1);
  });

  it('works whatever the order of the cards', () => {
    expect(currentCardIndex([cards[3], cards[0]], at('2026-12-18T20:00'))).toBe(1);
  });
});

describe('mapUrl', () => {
  it('encodes the address', () => {
    expect(mapUrl('930 SW 6th Ave, Portland, OR')).toBe('https://maps.google.com/?q=930%20SW%206th%20Ave%2C%20Portland%2C%20OR');
  });
});
