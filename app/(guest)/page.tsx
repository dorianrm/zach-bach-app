import { Button } from '@/components/Button';
import { Itinerary } from '@/components/Itinerary';
import { PageShell } from '@/components/PageShell';
import { cards, lastUpdated, venmoHandle } from '@/content/itinerary';
import { formatStamp } from '@/lib/time';

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
      <Button variant="secondary" href="/api/calendar.ics" className="h-12 w-full">
        Add weekend to calendar
      </Button>
    </PageShell>
  );
}
