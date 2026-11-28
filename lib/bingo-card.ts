import 'server-only';
import { db } from './db';
import { emptyMarks, shuffleTiles } from './bingo';

export type Card = { tileOrder: number[]; marks: boolean[]; place: number | null };

// The guest's card. The first visit shuffles one and saves it. If two first visits race
// (two phones at once), the second insert is ignored and both read the same saved card.
export async function getOrCreateCard(guestId: string): Promise<Card> {
  const insert = await db()
    .from('bingo_cards')
    .upsert({ guest_id: guestId, tile_order: shuffleTiles(), marks: emptyMarks() }, { onConflict: 'guest_id', ignoreDuplicates: true });
  if (insert.error) throw insert.error;
  const { data, error } = await db().from('bingo_cards').select('tile_order, marks, place').eq('guest_id', guestId).single();
  if (error) throw error;
  return { tileOrder: data.tile_order, marks: data.marks, place: data.place };
}

export type BingoWinner = { place: number; name: string };

// 1st, 2nd and 3rd so far, in order. Names only, so they are safe to show before the team reveal.
export async function loadBingoWinners(): Promise<BingoWinner[]> {
  const { data, error } = await db()
    .from('bingo_cards')
    .select('place, guests (name)')
    .not('place', 'is', null)
    .order('place');
  if (error) throw error;
  // bingo_cards.guest_id points at one guest, so Supabase returns an object. The untyped
  // client cannot know that and guesses an array.
  return data.map((row) => ({ place: row.place, name: (row.guests as unknown as { name: string }).name }));
}
