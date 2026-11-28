// Rules for Dorian's award buttons (T4). Pure, so they are unit tested.

export type AwardSource = 'bonus' | 'challenge' | 'placement' | 'bingo';

// The bonus chips on /admin/crawl. The server accepts any whole number from 1 to MAX_BONUS.
export const BONUS_CHIPS = [1, 2, 3, 5];
const MAX_BONUS = 10;
const MAX_NOTE = 60;

export type Bonus = { teamId: string; points: number; note: string | null };

// Checks the bonus form. A blank note is stored as null and shows as "Bonus".
export function parseBonus(teamId: unknown, points: unknown, note: unknown): Bonus | { error: string } {
  if (typeof teamId !== 'string' || teamId === '') return { error: 'Pick a squad.' };
  const n = Number(points);
  if (!Number.isInteger(n) || n < 1 || n > MAX_BONUS) return { error: `Points must be 1 to ${MAX_BONUS}.` };
  const text = typeof note === 'string' ? note.trim() : '';
  if (text.length > MAX_NOTE) return { error: `Keep the note under ${MAX_NOTE} characters.` };
  return { teamId, points: n, note: text === '' ? null : text };
}

const SOURCE_LABELS: Record<AwardSource, string> = {
  bonus: 'Bonus',
  challenge: 'Challenge',
  placement: 'Placement',
  bingo: 'Bingo',
};

// What a history line and a toast call an award: its note, else its kind.
export function awardLabel(row: { source: AwardSource; note: string | null }): string {
  return row.note ?? SOURCE_LABELS[row.source];
}

// "+2 Red Squad: groom's choice"
export function awardText(points: number, teamName: string, label: string): string {
  return `${points >= 0 ? '+' : ''}${points} ${teamName}: ${label}`;
}

