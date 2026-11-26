'use client';

import { useSyncExternalStore } from 'react';
import { days, type Card, type Day } from '@/content/itinerary';
import { currentCardIndex } from '@/lib/itinerary';
import { DayHeading } from './DayHeading';
import { EventCard } from './EventCard';

const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 15_000);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onChange);
  };
}

// Rounded to the minute so the snapshot stays stable between ticks.
const getNow = () => Math.floor(Date.now() / MINUTE) * MINUTE;
// The server cannot know the phone's clock, so it renders no "now" card.
const getServerNow = () => null;

export function Itinerary({ cards }: { cards: Card[] }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const nowIndex = now === null ? -1 : currentCardIndex(cards, now);

  const groups = (Object.keys(days) as Day[])
    .map((day) => ({ day, items: cards.map((card, index) => ({ card, index })).filter((c) => c.card.day === day) }))
    .filter((g) => g.items.length > 0);

  return groups.map(({ day, items }) => (
    <section key={day} className="flex flex-col gap-3">
      <DayHeading>{days[day]}</DayHeading>
      {items.map(({ card, index }) => (
        <EventCard key={index} card={card} number={index + 1} now={index === nowIndex} />
      ))}
    </section>
  ));
}
