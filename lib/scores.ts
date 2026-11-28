// Crawl standings, computed from award rows every time. Scores are never stored, so undo
// (T4) only marks a row undone and the totals follow.

export type TeamRow = { id: string; name: string; color: string; sort: number };
export type AwardRow = { team_id: string; points: number; undone_at: string | null };
export type RosterGuest = { name: string; team_id: string | null };

export type Standing = { id: string; name: string; color: string; total: number; members: string[] };

// Highest total first. A tie keeps the content order (teams.sort).
export function standings(teams: TeamRow[], awards: AwardRow[], guests: RosterGuest[]): Standing[] {
  const totals = new Map<string, number>();
  for (const a of awards) {
    if (a.undone_at === null) totals.set(a.team_id, (totals.get(a.team_id) ?? 0) + a.points);
  }
  return [...teams]
    .sort((x, y) => (totals.get(y.id) ?? 0) - (totals.get(x.id) ?? 0) || x.sort - y.sort)
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      total: totals.get(t.id) ?? 0,
      members: guests
        .filter((g) => g.team_id === t.id)
        .map((g) => g.name)
        .sort((a, b) => a.localeCompare(b)),
    }));
}
