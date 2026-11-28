'use server';

import { requireGuest } from '@/lib/auth';
import { hasLine, isMarkable } from '@/lib/bingo';
import { db } from '@/lib/db';

export type MarkResult = { marks: boolean[]; line: boolean; place: number | null };

// Marks or unmarks one tile on the guest's own card. Returns the saved marks, whether the
// card has a full line, and the guest's place once a mark finishes a line (null after three
// winners). Unmarking after a win keeps the place: honor system.
export async function setMark(position: number, marked: boolean): Promise<MarkResult> {
  const me = await requireGuest('/bingo');
  if (!me.playsBingo) throw new Error('This guest does not play bingo.');
  if (!isMarkable(position) || typeof marked !== 'boolean') throw new Error('Not a tile on the card.');
  const { data: marks, error } = await db().rpc('set_bingo_mark', { p_guest: me.id, p_position: position, p_marked: marked });
  if (error) throw error;
  if (!marks) throw new Error('No card yet. Reload the page.');

  const line = hasLine(marks);
  // Unmarking never wins, and it must not make a guest wait on the claim's table lock.
  if (!marked || !line) return { marks, line, place: null };
  const { data: place, error: claimError } = await db().rpc('claim_bingo_place', { p_guest: me.id });
  if (claimError) throw claimError;
  return { marks, line, place };
}
