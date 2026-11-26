// Edited by Dorian only. Bump lastUpdated on every edit, then push.
// All times are Pacific wall-clock time: 'YYYY-MM-DDTHH:mm'.

export type Day = 'fri' | 'sat';

export type Card = {
  day: Day;
  title: string;
  start?: string; // Omit for TBD.
  end?: string;
  endApprox?: boolean; // Shows the end as '~1:00 AM'.
  timeHint?: string; // Shown under 'TBD', e.g. 'afternoon'.
  label?: string; // Highlighted next to the number, e.g. 'Final round'.
  place?: string;
  address?: string; // Map link is built from this.
  description?: string;
  gettingThere?: string;
  bring?: string;
  cost?: string; // Shown with '(estimate)'.
  arriveEarly?: string;
  notes?: string[]; // ID, waivers, shoes.
  tag: string; // Gallery tag (T9).
};

export const lastUpdated = '2026-11-25T21:00';

// Set to the Venmo username (no '@') to show the "Pay Dorian" button.
export const venmoHandle: string | null = null;

export const days: Record<Day, string> = {
  fri: 'Friday, Dec 18',
  sat: 'Saturday, Dec 19',
};

export const cards: Card[] = [
  {
    day: 'fri',
    title: 'Dinner at Fogo de Chao',
    start: '2026-12-18T19:00',
    end: '2026-12-18T21:30',
    address: '930 SW 6th Ave, Portland, OR',
    description: 'All-you-can-eat churrasco in the main dining room. Bingo cards are on your phone.',
    tag: 'Dinner',
  },
  {
    day: 'fri',
    title: 'Bar crawl',
    start: '2026-12-18T21:30',
    end: '2026-12-19T01:00',
    endApprox: true,
    place: 'Old Town Portland',
    description: 'Squads, points at every stop. The next stop appears on the Crawl tab.',
    tag: 'Crawl',
  },
  {
    day: 'sat',
    title: 'Topgolf',
    timeHint: 'afternoon',
    place: 'Topgolf Hillsboro',
    address: 'Topgolf Hillsboro, OR',
    description: 'Food included.',
    tag: 'Topgolf',
  },
  {
    day: 'sat',
    title: 'Dinner and drinks',
    timeHint: 'evening',
    place: 'Pub near the arena, TBD',
    description: 'Keep drinks light before airsoft.',
    tag: 'Pub',
  },
  {
    day: 'sat',
    title: 'Private airsoft',
    start: '2026-12-19T20:30',
    end: '2026-12-19T22:30',
    label: 'Final round',
    place: 'Oregon Airsoft Arena, Hillsboro',
    address: '1600 NE 25th Ave, Hillsboro, OR',
    description: 'Squad vs squad, arena to ourselves.',
    arriveEarly: 'Arrive 15-30 min early.',
    tag: 'Airsoft',
  },
];
