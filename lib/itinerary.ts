import type { Card } from '../content/itinerary';
import { pacificToUtc } from './time';

// Index of the card happening at `nowMs`, or -1.
// A card with no end is "now" until the next card starts.
export function currentCardIndex(cards: Card[], nowMs: number): number {
  const timed = cards
    .map((card, index) => ({ card, index, start: card.start ? pacificToUtc(card.start) : null }))
    .filter((c): c is typeof c & { start: number } => c.start !== null)
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < timed.length; i++) {
    const { card, index, start } = timed[i];
    const end = card.end ? pacificToUtc(card.end) : (timed[i + 1]?.start ?? Infinity);
    if (nowMs >= start && nowMs < end) return index;
  }
  return -1;
}

export function mapUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}
