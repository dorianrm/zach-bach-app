import type { Card } from '../content/itinerary';
import { pacificToUtc, TIME_ZONE } from './time';

// RFC 5545 text escaping.
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545 folding: lines over 75 octets continue on the next line after a space.
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // Continuation lines start with a space.
    if (size + charSize > limit) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += charSize;
  }
  out.push(current);
  return out.join('\r\n ');
}

// 20261219T030000Z
function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Shared by the calendar file and the Google Calendar links.
function details(card: Card): { description: string; location: string } {
  return {
    description: [card.description, card.arriveEarly, card.gettingThere, card.bring, ...(card.notes ?? [])]
      .filter(Boolean)
      .join('\n'),
    location: [card.place, card.address].filter(Boolean).join(', '),
  };
}

// ?events=Dinner,Crawl keeps only those cards (by tag). Null (no ?events) keeps every card.
export function pickCards(cards: Card[], events: string | null): Card[] {
  if (events === null) return cards;
  const tags = events.split(',');
  return cards.filter((card) => tags.includes(card.tag));
}

// Every card with a start time. TBD cards are left out.
export function buildCalendar(cards: Card[], lastUpdated: string): string {
  const stamp = utcStamp(pacificToUtc(lastUpdated));
  const events = cards.flatMap((card) => {
    if (!card.start) return [];
    const { description, location } = details(card);
    return [
      'BEGIN:VEVENT',
      `UID:${card.start}-${card.tag.toLowerCase()}@zach-attack`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcStamp(pacificToUtc(card.start))}`,
      ...(card.end ? [`DTEND:${utcStamp(pacificToUtc(card.end))}`] : []),
      `SUMMARY:${escapeText(card.title)}`,
      ...(location ? [`LOCATION:${escapeText(location)}`] : []),
      ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
      'END:VEVENT',
    ];
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zach Attack//Weekend//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Zach Attack',
    ...events,
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

const HOUR = 60 * 60 * 1000;

// Google's "add event" page, filled in from one card. A link holds only one event.
// Null for a TBD card. A card with no end gets one hour.
export function googleCalendarUrl(card: Card): string | null {
  if (!card.start) return null;
  const start = pacificToUtc(card.start);
  const end = card.end ? pacificToUtc(card.end) : start + HOUR;
  const { description, location } = details(card);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: card.title,
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    ctz: TIME_ZONE,
  });
  if (description) params.set('details', description);
  if (location) params.set('location', location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
