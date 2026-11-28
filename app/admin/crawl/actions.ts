'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { awardLabel, awardText, parseBonus, parsePlacement, topTie } from '@/lib/awards';
import { crawlFinal, lastUndoable, loadStandings, teamsRevealed } from '@/lib/crawl';
import { PLACEMENT_POINTS } from '@/lib/crawl-rows';
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

const fail = (error: string): AwardResult => ({ error, at: Date.now() });
const FINAL_ERROR = 'The crawl is final. Points are locked.';

// "+N for team". The note is optional and shows in the team's history.
export async function bonus(_prev: AwardResult, form: FormData): Promise<AwardResult> {
  await requireAdmin();
  if (await crawlFinal()) return fail(FINAL_ERROR);
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
// A placement is one tap, so its rows are undone together.
export async function undoLast(): Promise<AwardResult> {
  await requireAdmin();
  if (await crawlFinal()) return fail(FINAL_ERROR);
  const last = await lastUndoable();
  if (!last) return fail('Nothing to undo.');

  // The undone_at guard means two taps that race cannot undo the same rows twice.
  const { data, error } = await db()
    .from('awards')
    .update({ undone_at: new Date().toISOString() })
    .in('id', last.ids)
    .is('undone_at', null)
    .select('id');
  if (error) throw error;
  if (!data?.length) return fail('Already undone. Check the scores.');
  refresh();
  return { message: `Undid ${last.text}`, at: Date.now() };
}

type ChallengeRow = { id: string; title: string; points: number; kind: 'award' | 'placement' };

async function challenge(id: unknown): Promise<ChallengeRow | null> {
  if (typeof id !== 'string' || id === '') return null;
  const { data, error } = await db().from('challenges').select('id, title, points, kind').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// Award in 2 taps: pick the challenge, then tap the squad. Gives the challenge's points.
export async function award(_prev: AwardResult, form: FormData): Promise<AwardResult> {
  await requireAdmin();
  if (await crawlFinal()) return fail(FINAL_ERROR);
  const c = await challenge(form.get('challengeId'));
  if (!c) return fail('Pick a challenge.');
  if (c.kind !== 'award') return fail('That one is head to head. Enter the placement.');
  const teamId = form.get('teamId');
  const name = typeof teamId === 'string' ? await teamName(teamId) : null;
  if (!name) return fail('Pick a squad.');

  const { error } = await db()
    .from('awards')
    .insert({ team_id: teamId, challenge_id: c.id, points: c.points, source: 'challenge', note: c.title });
  if (error) throw error;
  refresh();
  return { message: awardText(c.points, name, c.title), at: Date.now() };
}

const PLACES = ['1st', '2nd', '3rd'];

// Head to head: 3, 2 and 1 points. One insert, so the rows land together and share
// created_at, which is how undo finds them as one placement.
export async function placement(_prev: AwardResult, form: FormData): Promise<AwardResult> {
  await requireAdmin();
  if (await crawlFinal()) return fail(FINAL_ERROR);
  const c = await challenge(form.get('challengeId'));
  if (!c) return fail('Pick a challenge.');
  if (c.kind !== 'placement') return fail('That one is not head to head. Tap a squad instead.');
  const order = parsePlacement([form.get('first'), form.get('second'), form.get('third')]);
  if ('error' in order) return fail(order.error);
  const names = await Promise.all(order.map(teamName));
  if (names.some((n) => n === null)) return fail('That squad no longer exists.');

  const { error } = await db()
    .from('awards')
    .insert(
      order.map((teamId, i) => ({
        team_id: teamId,
        challenge_id: c.id,
        points: PLACEMENT_POINTS[i],
        source: 'placement',
        note: `${PLACES[i]}: ${c.title}`,
      })),
    );
  if (error) throw error;
  refresh();
  return { message: `${c.title}: ${names.map((n, i) => `${PLACES[i]} ${n}`).join(', ')}`, at: Date.now() };
}

async function revealedStops(): Promise<{ id: string; revealed_at: string | null }[]> {
  const { data, error } = await db().from('stops').select('id, revealed_at').order('sort');
  if (error) throw error;
  return data ?? [];
}

// Shows the next stop in route order on every phone. Refused before the teams reveal,
// because guests get no stops until then.
export async function revealNextStop(): Promise<void> {
  await requireAdmin();
  if (!(await teamsRevealed())) return;
  const next = (await revealedStops()).find((s) => s.revealed_at === null);
  if (next) {
    const { error } = await db()
      .from('stops')
      .update({ revealed_at: new Date().toISOString() })
      .eq('id', next.id)
      .is('revealed_at', null);
    if (error) throw error;
  }
  refresh();
}

// Hides the newest revealed stop again, for a reveal tapped too early.
export async function hideLastStop(): Promise<void> {
  await requireAdmin();
  const last = (await revealedStops()).filter((s) => s.revealed_at !== null).at(-1);
  if (last) {
    const { error } = await db().from('stops').update({ revealed_at: null }).eq('id', last.id);
    if (error) throw error;
  }
  refresh();
}

// Ends the crawl: every phone shows the winner and points lock. A tie at the top is
// refused, so Zach can pick a tiebreaker and Dorian enters it as a +1 bonus first.
export async function finalize(): Promise<AwardResult> {
  await requireAdmin();
  const tie = topTie(await loadStandings());
  if (tie) {
    const names = tie.map((t) => t.name).join(' and ');
    return fail(`${names} are tied at ${tie[0].total}. Play a tiebreaker, give the winner +1, then finalize.`);
  }
  const { error } = await db().from('settings').upsert({ key: 'crawl_final', value: true });
  if (error) throw error;
  refresh();
  return { message: 'The crawl is final.', at: Date.now() };
}
