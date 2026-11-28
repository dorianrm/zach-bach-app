'use server';

import { requireGuest } from '@/lib/auth';
import { isMarkable } from '@/lib/bingo';
import { db } from '@/lib/db';

// Marks or unmarks one tile on the guest's own card. Returns the saved marks.
export async function setMark(position: number, marked: boolean): Promise<boolean[]> {
  const me = await requireGuest('/bingo');
  if (!me.playsBingo) throw new Error('This guest does not play bingo.');
  if (!isMarkable(position) || typeof marked !== 'boolean') throw new Error('Not a tile on the card.');
  const { data, error } = await db().rpc('set_bingo_mark', { p_guest: me.id, p_position: position, p_marked: marked });
  if (error) throw error;
  if (!data) throw new Error('No card yet. Reload the page.');
  return data;
}
