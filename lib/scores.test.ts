import { describe, expect, it } from 'vitest';
import { standings, type AwardRow, type TeamRow } from './scores';

const teams: TeamRow[] = [
  { id: 'red', name: 'Red Squad', color: '#ff6b5e', sort: 0 },
  { id: 'gray', name: 'Gray Squad', color: '#c3cad6', sort: 1 },
  { id: 'gold', name: 'Gold Squad', color: '#ffd84d', sort: 2 },
];
let seq = 0;
// A live bonus row. Each new row is one minute after the last one.
const live = (team_id: string, points: number, extra: Partial<AwardRow> = {}): AwardRow => {
  seq += 1;
  return {
    id: `a${seq}`,
    team_id,
    points,
    source: 'bonus',
    note: null,
    created_at: new Date(Date.UTC(2026, 11, 19, 5, seq)).toISOString(),
    undone_at: null,
    ...extra,
  };
};

describe('standings', () => {
  it('starts every team at 0, in content order', () => {
    expect(standings(teams, [], []).map((s) => [s.id, s.total])).toEqual([
      ['red', 0],
      ['gray', 0],
      ['gold', 0],
    ]);
  });

  it('sums live awards and sorts by total', () => {
    const result = standings(teams, [live('gold', 3), live('gray', 2), live('gold', 1)], []);
    expect(result.map((s) => [s.id, s.total])).toEqual([
      ['gold', 4],
      ['gray', 2],
      ['red', 0],
    ]);
  });

  it('ignores undone awards', () => {
    const result = standings(teams, [live('red', 2), live('red', 5, { undone_at: '2026-12-19T06:00:00Z' })], []);
    expect(result[0]).toMatchObject({ id: 'red', total: 2 });
  });

  it('keeps content order on a tie', () => {
    expect(standings(teams, [live('gold', 1), live('gray', 1)], []).map((s) => s.id)).toEqual(['gray', 'gold', 'red']);
  });

  it('lists each team members by name, and leaves out guests with no team', () => {
    const guests = [
      { name: 'Nic', team_id: 'red' },
      { name: 'Alex', team_id: 'red' },
      { name: 'Zach', team_id: null },
    ];
    const red = standings(teams, [], guests).find((s) => s.id === 'red')!;
    expect(red.members).toEqual(['Alex', 'Nic']);
  });

  it('lists a team history newest first, without undone rows, in Pacific time', () => {
    const awards = [
      live('red', 2, { id: 'first', note: "Groom's choice", created_at: '2026-12-19T05:14:00Z' }),
      live('red', 3, { id: 'gone', created_at: '2026-12-19T05:20:00Z', undone_at: '2026-12-19T05:21:00Z' }),
      live('red', 1, { id: 'second', created_at: '2026-12-19T05:30:00.123456+00:00' }),
      live('gray', 5, { id: 'other' }),
    ];
    const red = standings(teams, awards, []).find((s) => s.id === 'red')!;
    expect(red.history).toEqual([
      { id: 'second', points: 1, label: 'Bonus', time: '9:30 PM' },
      { id: 'first', points: 2, label: "Groom's choice", time: '9:14 PM' },
    ]);
  });
});
