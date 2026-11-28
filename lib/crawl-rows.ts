// Turns content/crawl.ts into stops and challenges rows. Used by the seed and the e2e
// fixtures, so it uses relative imports only. Throws on content mistakes before any write.

import type { Challenge, Stop } from '../content/crawl.ts';

export type StopRow = { id: string; sort: number; name: string; address: string };
export type ChallengeRow = {
  id: string;
  stop_id: string | null;
  sort: number;
  title: string;
  points: number;
  kind: 'award' | 'placement';
};

// 1st, 2nd and 3rd in a head-to-head challenge.
export const PLACEMENT_POINTS = [3, 2, 1];

export function crawlRows(stops: Stop[], anytime: Challenge[]): { stops: StopRow[]; challenges: ChallengeRow[] } {
  const ids = new Set<string>();
  const unique = (id: string) => {
    if (ids.has(id)) throw new Error(`Duplicate crawl id '${id}'`);
    ids.add(id);
  };
  const challenge = (c: Challenge, stopId: string | null, sort: number): ChallengeRow => {
    unique(c.id);
    if (c.kind === 'award' && !(Number.isInteger(c.points) && c.points! > 0)) {
      throw new Error(`${c.id}: an 'award' challenge needs whole points above 0`);
    }
    const points = c.kind === 'placement' ? PLACEMENT_POINTS[0] : c.points!;
    return { id: c.id, stop_id: stopId, sort, title: c.title, points, kind: c.kind };
  };

  return {
    stops: stops.map((s, i) => {
      unique(s.id);
      return { id: s.id, sort: i, name: s.name, address: s.address };
    }),
    challenges: [
      ...stops.flatMap((s) => s.challenges.map((c, i) => challenge(c, s.id, i))),
      ...anytime.map((c, i) => challenge(c, null, i)),
    ],
  };
}
