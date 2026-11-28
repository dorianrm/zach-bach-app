import 'server-only';
import { awardLabel, awardText } from './awards';
import { db } from './db';
import { standings, type Standing } from './scores';

export type ChallengeView = { id: string; title: string; points: number; kind: 'award' | 'placement' };
export type StopView = { id: string; name: string; address: string; revealed: boolean; challenges: ChallengeView[] };

// What guest phones poll from GET /api/state. Before the reveal it holds no rosters, scores
// or stops, so a guest cannot read them early from the network tab. After it, only revealed
// stops are sent: the last one is the current stop.
export type CrawlState =
  | { teamsRevealed: false }
  | { teamsRevealed: true; standings: Standing[]; stops: StopView[]; anytime: ChallengeView[]; crawlFinal: boolean };

async function setting(key: string): Promise<boolean> {
  const { data, error } = await db().from('settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data?.value === true;
}

export const teamsRevealed = () => setting('teams_revealed');
export const crawlFinal = () => setting('crawl_final');

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

// Every stop in route order, revealed or not, with its challenges, plus the anytime
// challenges. Admin pages read all of it. Guests get only the revealed stops.
export async function loadRoute(): Promise<{ stops: StopView[]; anytime: ChallengeView[] }> {
  const [stops, challenges] = await Promise.all([
    db().from('stops').select('id, name, address, revealed_at').order('sort'),
    db().from('challenges').select('id, stop_id, title, points, kind').order('sort'),
  ]);
  for (const r of [stops, challenges]) if (r.error) throw r.error;
  const view = (c: { id: string; title: string; points: number; kind: 'award' | 'placement' }): ChallengeView => ({
    id: c.id,
    title: c.title,
    points: c.points,
    kind: c.kind,
  });
  return {
    stops: (stops.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      revealed: s.revealed_at !== null,
      challenges: (challenges.data ?? []).filter((c) => c.stop_id === s.id).map(view),
    })),
    anytime: (challenges.data ?? []).filter((c) => c.stop_id === null).map(view),
  };
}

export async function crawlState(): Promise<CrawlState> {
  if (!(await teamsRevealed())) return { teamsRevealed: false };
  const [standings, route, final] = await Promise.all([loadStandings(), loadRoute(), crawlFinal()]);
  // Upcoming stops never leave the server.
  const stops = route.stops.filter((s) => s.revealed);
  return { teamsRevealed: true, standings, stops, anytime: route.anytime, crawlFinal: final };
}

// What "Undo last" takes back: the newest live award that Dorian gave, with every row of
// it (a placement is up to three rows, written in one insert, so they share created_at).
// Bingo rows (T7) come from guests, so undo skips them.
export async function lastUndoable(): Promise<{ ids: string[]; text: string } | null> {
  const live = () =>
    db()
      .from('awards')
      .select('id, points, source, note, challenge_id, created_at, teams (name)')
      .is('undone_at', null)
      .neq('source', 'bingo');
  const { data: last, error } = await live().order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!last) return null;

  let rows = [last];
  if (last.source === 'placement') {
    const group = await live().eq('challenge_id', last.challenge_id).eq('created_at', last.created_at).order('points', { ascending: false });
    if (group.error) throw group.error;
    rows = group.data ?? [last];
  }
  // awards.team_id points at one team, so Supabase returns an object here. The untyped
  // client cannot know that and guesses an array.
  const text = rows
    .map((r) => awardText(r.points, (r.teams as unknown as { name: string } | null)?.name ?? 'Unknown squad', awardLabel(r)))
    .join(', ');
  return { ids: rows.map((r) => r.id), text };
}
