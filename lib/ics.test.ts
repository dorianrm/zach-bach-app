import { describe, expect, it } from 'vitest';
import { cards, lastUpdated } from '../content/itinerary';
import { buildCalendar, googleCalendarUrl, pickCards } from './ics';

const ics = buildCalendar(cards, lastUpdated);
const unfolded = ics.replace(/\r\n /g, '');

describe('buildCalendar', () => {
  it('uses CRLF and wraps events in a calendar', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('includes every card with a start and leaves TBD cards out', () => {
    const timed = cards.filter((c) => c.start).length;
    expect(unfolded.match(/BEGIN:VEVENT/g)).toHaveLength(timed);
    expect(unfolded).not.toContain('SUMMARY:Topgolf');
  });

  it('writes times in UTC', () => {
    expect(unfolded).toContain('DTSTART:20261219T030000Z'); // Fri 7:00 PM Pacific.
  });

  it('escapes commas in text', () => {
    expect(unfolded).toContain('LOCATION:930 SW 6th Ave\\, Portland\\, OR');
  });

  it('folds lines at 75 octets', () => {
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe('pickCards', () => {
  it('keeps every card without ?events', () => {
    expect(pickCards(cards, null)).toEqual(cards);
  });

  it('keeps only the picked tags, in content order', () => {
    expect(pickCards(cards, 'Airsoft,Dinner').map((c) => c.tag)).toEqual(['Dinner', 'Airsoft']);
  });

  it('ignores unknown tags', () => {
    expect(pickCards(cards, 'Nope')).toEqual([]);
  });
});

describe('googleCalendarUrl', () => {
  const dinner = cards.find((c) => c.tag === 'Dinner')!;
  const url = new URL(googleCalendarUrl(dinner)!);

  it('fills in the event in UTC, shown in Pacific', () => {
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Dinner at Fogo de Chao');
    expect(url.searchParams.get('dates')).toBe('20261219T030000Z/20261219T053000Z');
    expect(url.searchParams.get('ctz')).toBe('America/Los_Angeles');
    expect(url.searchParams.get('location')).toBe('930 SW 6th Ave, Portland, OR');
  });

  it('gives a card with no end one hour', () => {
    const noEnd = new URL(googleCalendarUrl({ ...dinner, end: undefined })!);
    expect(noEnd.searchParams.get('dates')).toBe('20261219T030000Z/20261219T040000Z');
  });

  it('is null for a TBD card', () => {
    expect(googleCalendarUrl(cards.find((c) => c.tag === 'Topgolf')!)).toBeNull();
  });
});
