import { describe, expect, it } from 'vitest';
import { standings, type TeamRow } from './scores';

const teams: TeamRow[] = [
  { id: 'red', name: 'Red Squad', color: '#ff6b5e', sort: 0 },
  { id: 'gray', name: 'Gray Squad', color: '#c3cad6', sort: 1 },
  { id: 'gold', name: 'Gold Squad', color: '#ffd84d', sort: 2 },
];
const live = (team_id: string, points: number) => ({ team_id, points, undone_at: null });

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
    const result = standings(teams, [live('red', 2), { team_id: 'red', points: 5, undone_at: '2026-12-19T06:00:00Z' }], []);
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
});
