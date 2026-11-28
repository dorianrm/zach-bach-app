import 'server-only';
import { db } from './db';
import { emptyMarks, shuffleTiles } from './bingo';

export type Card = { tileOrder: number[]; marks: boolean[] };

// The guest's card. The first visit shuffles one and saves it. If two first visits race
// (two phones at once), the second insert is ignored and both read the same saved card.
export async function getOrCreateCard(guestId: string): Promise<Card> {
  const insert = await db()
    .from('bingo_cards')
    .upsert({ guest_id: guestId, tile_order: shuffleTiles(), marks: emptyMarks() }, { onConflict: 'guest_id', ignoreDuplicates: true });
  if (insert.error) throw insert.error;
  const { data, error } = await db().from('bingo_cards').select('tile_order, marks').eq('guest_id', guestId).single();
  if (error) throw error;
  return { tileOrder: data.tile_order, marks: data.marks };
}
