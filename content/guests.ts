// Edited by Dorian only. After an edit, re-run the seed: npm run seed
// Placeholder names until the real list arrives.

export type Team = { id: string; name: string; color: string };

export type Guest = {
  name: string;
  team?: string; // Team id. Omit for no team.
  isAdmin?: boolean;
  playsBingo?: boolean; // Defaults to true. Zach does not play.
};

// Order here is the display order. Colors are data, not tokens.
export const teams: Team[] = [
  { id: 'red', name: 'Red Squad', color: '#ff6b5e' },
  { id: 'gray', name: 'Gray Squad', color: '#c3cad6' },
  { id: 'gold', name: 'Gold Squad', color: '#ffd84d' },
];

export const guests: Guest[] = [
  { name: 'Dorian', team: 'red', isAdmin: true },
  { name: 'Zach', playsBingo: false },
  { name: 'Test Guest A', team: 'red' },
  { name: 'Test Guest B', team: 'gray' },
  { name: 'Test Guest C', team: 'gold' },
];
