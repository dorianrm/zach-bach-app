// Crawl standings, computed from award rows every time. Scores are never stored, so undo
// (T4) only marks a row undone and the totals follow.

import { awardLabel, type AwardSource } from './awards';
import { formatInstant } from './time';

export type TeamRow = { id: string; name: string; color: string; sort: number };
export type AwardRow = {
  id: string;
  team_id: string;
  points: number;
  source: AwardSource;
  note: string | null;
  created_at: string;
  undone_at: string | null;
};
export type RosterGuest = { name: string; team_id: string | null };

// One line of a team's point history, such as "9:14 PM  Groom's choice  +2".
export type HistoryLine = { id: string; points: number; label: string; time: string };

export type Standing = {
  id: string;
  name: string;
  color: string;
  total: number;
  members: string[];
  history: HistoryLine[];
};

// Highest total first. A tie keeps the content order (teams.sort).
// History holds live rows only, newest first.
export function standings(teams: TeamRow[], awards: AwardRow[], guests: RosterGuest[]): Standing[] {
  const live = awards
    .filter((a) => a.undone_at === null)
    .sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at));
  const totals = new Map<string, number>();
  for (const a of live) totals.set(a.team_id, (totals.get(a.team_id) ?? 0) + a.points);
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
      history: live
        .filter((a) => a.team_id === t.id)
        .map((a) => ({ id: a.id, points: a.points, label: awardLabel(a), time: formatInstant(a.created_at) })),
    }));
}
