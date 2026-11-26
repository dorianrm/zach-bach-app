import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { parseKey } from './pin';
import { EVENT_COOKIE, isAdmin, parseSecret, SESSION_COOKIE, verifyEvent, verifySession, type Session } from './session';

// Env readers. They throw at request time if a value is missing, so a bad deploy fails loudly.
export const sessionSecret = () => parseSecret(process.env.SESSION_SECRET);
export const pinKey = () => parseKey(process.env.PIN_ENCRYPTION_KEY);
export function eventCode(): string {
  const code = process.env.EVENT_CODE;
  if (!code) throw new Error('EVENT_CODE must be set');
  return code;
}

export async function hasEventCookie(): Promise<boolean> {
  const token = (await cookies()).get(EVENT_COOKIE)?.value;
  return verifyEvent(token, eventCode(), sessionSecret());
}

export async function getSession(): Promise<Session | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value, sessionSecret());
}

export type Guest = { id: string; name: string; teamId: string | null; isAdmin: boolean; playsBingo: boolean };

// For server actions and pages that need a guest. Sends anyone else to /join.
// The guest is re-read from the database, so a guest removed from the list loses access.
export async function requireGuest(next = '/'): Promise<Guest> {
  const session = await getSession();
  if (session) {
    const { data } = await db()
      .from('guests')
      .select('id, name, team_id, is_admin, plays_bingo')
      .eq('id', session.guestId)
      .maybeSingle();
    if (data) {
      return { id: data.id, name: data.name, teamId: data.team_id, isAdmin: data.is_admin, playsBingo: data.plays_bingo };
    }
  }
  redirect(`/join?next=${encodeURIComponent(next)}`);
}

// Only same-site paths, so /join?next= cannot send a guest to another site.
export function safeNext(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : '/';
}

// For admin pages and actions. Needs both: the guest row has is_admin, and the session
// is inside the 12-hour window opened by the admin PIN. Anyone else goes to /admin.
export async function requireAdmin(): Promise<Guest> {
  if (isAdmin(await getSession())) {
    const guest = await requireGuest('/admin');
    if (guest.isAdmin) return guest;
  }
  redirect('/admin');
}

// Shared by guest and admin PIN checks. Null once the lock has passed.
export function lockedMessage(until: string | null): string | null {
  const ms = until ? new Date(until).getTime() - Date.now() : 0;
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / 60_000);
  return `Too many wrong tries. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or ask Dorian.`;
}
