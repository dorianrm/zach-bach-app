// Edited by Dorian only. After an edit, re-run the seed: npm run seed
// PLACEHOLDERS: the real stops, challenges and points are still owed (Open questions).
//
// - Stops show to guests one at a time, in this order, when Dorian taps "Reveal next stop".
// - A challenge with no stop is an anytime challenge, shown all night.
// - 'award': Dorian gives `points` to one squad. 'placement': head-to-head, 1st gets 3,
//   2nd gets 2, 3rd gets 1.
// - Ids are slugs. Keep an id when you edit a stop or a challenge, so its awards stay linked.

export type Challenge = { id: string; title: string; kind: 'award' | 'placement'; points?: number };
export type Stop = { id: string; name: string; address: string; challenges: Challenge[] };

export const rules: string[] = [
  'Stay with your squad. Every member counts.',
  'Dorian awards every point. His call is final.',
  'Be kind to bar staff, and tip well.',
];

export const stops: Stop[] = [
  {
    id: 'stop-1',
    name: 'Stop 1 (placeholder)',
    address: 'Old Town, Portland, OR',
    challenges: [
      { id: 'stop-1-photo', title: 'Squad photo with the bartender', kind: 'award', points: 2 },
      { id: 'stop-1-darts', title: 'Darts, head to head', kind: 'placement' },
    ],
  },
  {
    id: 'stop-2',
    name: 'Stop 2 (placeholder)',
    address: 'Chinatown, Portland, OR',
    challenges: [
      { id: 'stop-2-toast', title: 'Best toast to Zach', kind: 'award', points: 3 },
      { id: 'stop-2-trivia', title: 'Zach trivia, head to head', kind: 'placement' },
    ],
  },
];

export const anytime: Challenge[] = [
  { id: 'any-stranger', title: 'A stranger buys Zach a drink', kind: 'award', points: 3 },
  { id: 'any-chant', title: 'Whole bar joins a squad chant', kind: 'award', points: 2 },
];
