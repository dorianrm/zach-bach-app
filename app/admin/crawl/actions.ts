'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { awardLabel, awardText, parseBonus } from '@/lib/awards';
import { lastUndoable } from '@/lib/crawl';
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

// What the toast on /admin/crawl shows after an award or an undo. `at` makes each answer
// new, so the same text twice in a row still shows the toast again.
export type AwardResult = { message?: string; error?: string; at?: number };

async function teamName(teamId: string): Promise<string | null> {
  const { data, error } = await db().from('teams').select('name').eq('id', teamId).maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
}

// "+N for team". The note is optional and shows in the team's history.
export async function bonus(_prev: AwardResult, form: FormData): Promise<AwardResult> {
  await requireAdmin();
  const input = parseBonus(form.get('teamId'), form.get('points'), form.get('note'));
  if ('error' in input) return { error: input.error, at: Date.now() };
  const name = await teamName(input.teamId);
  if (!name) return { error: 'That squad no longer exists.', at: Date.now() };

  const { error } = await db()
    .from('awards')
    .insert({ team_id: input.teamId, points: input.points, source: 'bonus', note: input.note });
  if (error) throw error;
  refresh();
  return { message: awardText(input.points, name, awardLabel({ source: 'bonus', note: input.note })), at: Date.now() };
}

// Takes back the newest live award that Dorian gave. Never deletes: it sets undone_at, so
// history stays readable and the totals follow.
export async function undoLast(): Promise<AwardResult> {
  await requireAdmin();
  const last = await lastUndoable();
  if (!last) return { error: 'Nothing to undo.', at: Date.now() };

  // The undone_at guard means two taps that race cannot undo the same row twice.
  const { data, error } = await db()
    .from('awards')
    .update({ undone_at: new Date().toISOString() })
    .eq('id', last.id)
    .is('undone_at', null)
    .select('id');
  if (error) throw error;
  if (!data?.length) return { error: 'Already undone. Check the scores.', at: Date.now() };
  refresh();
  return { message: `Undid ${last.text}`, at: Date.now() };
}
