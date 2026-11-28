import { describe, expect, it } from 'vitest';
import { awardLabel, awardText, parseBonus, parsePlacement, topTie } from './awards';

describe('parseBonus', () => {
  it('accepts a squad, whole points and a note', () => {
    expect(parseBonus('red', '2', "  Groom's choice ")).toEqual({ teamId: 'red', points: 2, note: "Groom's choice" });
  });

  it('stores a blank note as null', () => {
    expect(parseBonus('red', '1', '   ')).toEqual({ teamId: 'red', points: 1, note: null });
    expect(parseBonus('red', '1', null)).toEqual({ teamId: 'red', points: 1, note: null });
  });

  it('needs a squad', () => {
    expect(parseBonus(null, '2', '')).toEqual({ error: 'Pick a squad.' });
    expect(parseBonus('', '2', '')).toEqual({ error: 'Pick a squad.' });
  });

  it('refuses points that are not a whole number from 1 to 10', () => {
    for (const points of ['0', '-2', '11', '1.5', 'abc', '', null]) {
      expect(parseBonus('red', points, '')).toEqual({ error: 'Points must be 1 to 10.' });
    }
  });

  it('refuses a note over 60 characters', () => {
    expect(parseBonus('red', '1', 'x'.repeat(61))).toEqual({ error: 'Keep the note under 60 characters.' });
  });
});

describe('award text', () => {
  it('uses the note, else the kind of award', () => {
    expect(awardLabel({ source: 'bonus', note: 'Tiebreaker' })).toBe('Tiebreaker');
    expect(awardLabel({ source: 'bonus', note: null })).toBe('Bonus');
    expect(awardLabel({ source: 'bingo', note: null })).toBe('Bingo');
  });

  it('reads like the toast', () => {
    expect(awardText(2, 'Red Squad', "Groom's choice")).toBe("+2 Red Squad: Groom's choice");
  });
});

describe('parsePlacement', () => {
  it('keeps the finishing order', () => {
    expect(parsePlacement(['gold', 'red', 'gray'])).toEqual(['gold', 'red', 'gray']);
  });

  it('allows a head-to-head with two squads', () => {
    expect(parsePlacement(['gray', 'red', ''])).toEqual(['gray', 'red']);
    expect(parsePlacement(['gray', 'red', null])).toEqual(['gray', 'red']);
  });

  it('needs 1st and 2nd', () => {
    expect(parsePlacement(['red', '', 'gray'])).toEqual({ error: 'Pick 1st and 2nd.' });
    expect(parsePlacement([null, null, null])).toEqual({ error: 'Pick 1st and 2nd.' });
  });

  it('refuses a squad placed twice', () => {
    expect(parsePlacement(['red', 'red', ''])).toEqual({ error: 'A squad can only place once.' });
    expect(parsePlacement(['red', 'gray', 'red'])).toEqual({ error: 'A squad can only place once.' });
  });
});

describe('topTie', () => {
  const team = (name: string, total: number) => ({ name, total });

  it('is null with one clear leader', () => {
    expect(topTie([team('Red', 5), team('Gray', 4), team('Gold', 4)])).toBeNull();
  });

  it('lists every team tied at the top', () => {
    expect(topTie([team('Red', 5), team('Gray', 5), team('Gold', 5)])?.map((t) => t.name)).toEqual(['Red', 'Gray', 'Gold']);
    expect(topTie([team('Red', 5), team('Gray', 5), team('Gold', 1)])?.map((t) => t.name)).toEqual(['Red', 'Gray']);
  });

  it('counts 0 to 0 as a tie', () => {
    expect(topTie([team('Red', 0), team('Gray', 0)])).not.toBeNull();
  });
});
