import 'server-only';
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
    db().from('awards').select('team_id, points, undone_at').is('undone_at', null),
    db().from('guests').select('name, team_id'),
  ]);
  for (const r of [teams, awards, guests]) if (r.error) throw r.error;
  return standings(teams.data ?? [], awards.data ?? [], guests.data ?? []);
}

export async function crawlState(): Promise<CrawlState> {
  if (!(await teamsRevealed())) return { teamsRevealed: false };
  return { teamsRevealed: true, standings: await loadStandings() };
}
