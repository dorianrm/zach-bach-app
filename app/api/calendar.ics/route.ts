import { cards, lastUpdated } from '@/content/itinerary';
import { buildCalendar } from '@/lib/ics';

// Built from content/ only, so it is prerendered at build time.
export function GET() {
  return new Response(buildCalendar(cards, lastUpdated), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="zach-attack.ics"',
    },
  });
}
