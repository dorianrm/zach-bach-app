'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

async function setTeamsRevealed(value: boolean): Promise<void> {
  await requireAdmin();
  const { error } = await db().from('settings').upsert({ key: 'teams_revealed', value });
  if (error) throw error;
  refresh();
}

// Shows rosters and the scoreboard on every phone. Guest phones pick it up on their next poll.
export async function revealTeams(): Promise<void> {
  await setTeamsRevealed(true);
}

// Hides them again, for a reveal tapped too early. Phones go back to "Teams revealed soon."
export async function hideTeams(): Promise<void> {
  await setTeamsRevealed(false);
}
