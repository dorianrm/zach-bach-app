import 'server-only';
import { awardLabel, awardText } from './awards';
import { db } from './db';
import { standings, type Standing } from './scores';

// What guest phones poll from GET /api/state. Before the reveal it holds no rosters or
// scores, so a guest cannot read the teams early from the network tab.
export type CrawlState = { teamsRevealed: false } | { teamsRevealed: true; standings: Standing[] };

export async function teamsRevealed(): Promise<boolean> {
  const { data, error } = await db().from('settings').select('value').eq('key', 'teams_revealed').maybeSingle();
  if (error) throw error;
  return data?.value === true;
}

// Rosters and totals for every team. Admin pages read this before the reveal too.
export async function loadStandings(): Promise<Standing[]> {
  const [teams, awards, guests] = await Promise.all([
    db().from('teams').select('id, name, color, sort'),
    db().from('awards').select('id, team_id, points, source, note, created_at, undone_at').is('undone_at', null),
    db().from('guests').select('name, team_id'),
  ]);
  for (const r of [teams, awards, guests]) if (r.error) throw r.error;
  return standings(teams.data ?? [], awards.data ?? [], guests.data ?? []);
}

export async function crawlState(): Promise<CrawlState> {
  if (!(await teamsRevealed())) return { teamsRevealed: false };
  return { teamsRevealed: true, standings: await loadStandings() };
}

// The award "Undo last" takes back: the newest live row that Dorian gave. Bingo rows (T7)
// come from guests, so undo skips them.
export async function lastUndoable(): Promise<{ id: string; text: string } | null> {
  const { data, error } = await db()
    .from('awards')
    .select('id, points, source, note, teams (name)')
    .is('undone_at', null)
    .neq('source', 'bingo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // awards.team_id points at one team, so Supabase returns an object here. The untyped
  // client cannot know that and guesses an array.
  const team = data.teams as unknown as { name: string } | null;
  return { id: data.id, text: awardText(data.points, team?.name ?? 'Unknown squad', awardLabel(data)) };
}
