'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { emptyMarks } from '@/lib/bingo';
import { db } from '@/lib/db';

// Takes back a wrong win: clears the place, undoes the team's head start, and clears the
// guest's marks (same layout). Without the clear, their next tap would win the place back.
// Other winners keep their places.
export async function removeBingoWinner(form: FormData): Promise<void> {
  await requireAdmin();
  const guestId = String(form.get('guestId') ?? '');
  const { data: card, error } = await db().from('bingo_cards').select('place').eq('guest_id', guestId).maybeSingle();
  if (error) throw error;
  if (!card?.place) return refresh(); // Already removed, for example a second tap.

  // Only if the place has not changed since the read, so a double tap undoes one award.
  const cleared = await db()
    .from('bingo_cards')
    .update({ place: null, won_at: null, marks: emptyMarks() })
    .eq('guest_id', guestId)
    .eq('place', card.place)
    .select('guest_id');
  if (cleared.error) throw cleared.error;
  if (cleared.data.length === 0) return refresh();

  // Each place has one live bingo row, and its points (3, 2, 1) name the place.
  // Undone, never deleted, so the team history stays readable.
  const undone = await db()
    .from('awards')
    .update({ undone_at: new Date().toISOString() })
    .eq('source', 'bingo')
    .eq('points', 4 - card.place)
    .is('undone_at', null);
  if (undone.error) throw undone.error;
  refresh();
}

// Before the weekend: deletes every card, place and bingo award, for example after checks
// on a Vercel preview (which uses the real database). Cards are shuffled again on the next visit.
export async function clearAllBingo(): Promise<void> {
  await requireAdmin();
  const cards = await db().from('bingo_cards').delete().not('guest_id', 'is', null);
  if (cards.error) throw cards.error;
  const awards = await db().from('awards').delete().eq('source', 'bingo');
  if (awards.error) throw awards.error;
  refresh();
}
