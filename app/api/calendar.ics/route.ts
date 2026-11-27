import type { NextRequest } from 'next/server';
import { cards, lastUpdated } from '@/content/itinerary';
import { buildCalendar, pickCards } from '@/lib/ics';

// Each guest picks the events they attend (see pickCards).
// Reading the URL makes this run per request, not at build time.
export function GET(request: NextRequest) {
  const chosen = pickCards(cards, request.nextUrl.searchParams.get('events'));
  return new Response(buildCalendar(chosen, lastUpdated), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="zach-attack.ics"',
    },
  });
}
