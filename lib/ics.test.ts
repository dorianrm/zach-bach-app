import { describe, expect, it } from 'vitest';
import { cards, lastUpdated } from '../content/itinerary';
import { buildCalendar } from './ics';

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
