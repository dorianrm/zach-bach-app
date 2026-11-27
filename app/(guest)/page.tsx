import { Button } from '@/components/Button';
import { CalendarPicker, type CalendarEvent } from '@/components/CalendarPicker';
import { Itinerary } from '@/components/Itinerary';
import { PageShell } from '@/components/PageShell';
import { cards, lastUpdated, venmoHandle } from '@/content/itinerary';
import { googleCalendarUrl } from '@/lib/ics';
import { formatClock, formatStamp } from '@/lib/time';

// TBD cards have no time yet, so they cannot go in a calendar.
const calendarEvents: CalendarEvent[] = cards.flatMap((card) => {
  const googleUrl = googleCalendarUrl(card);
  if (!card.start || !googleUrl) return [];
  const { clock, period } = formatClock(card.start);
  const day = card.day === 'fri' ? 'Fri' : 'Sat';
  return [{ tag: card.tag, title: card.title, when: `${day} ${clock} ${period}`, googleUrl }];
});

export default function PlanPage() {
  return (
    <PageShell
      active="plan"
      headerAside={
        <>
          <p className="font-mono text-xs font-medium text-hero-muted">Updated {formatStamp(lastUpdated)}</p>
          {venmoHandle && <Button href={`https://venmo.com/u/${venmoHandle}`}>Pay Dorian</Button>}
        </>
      }
    >
      <Itinerary cards={cards} />
      <CalendarPicker events={calendarEvents} />
    </PageShell>
  );
}
