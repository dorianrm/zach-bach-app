'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminPinHash, hasEventCookie, lockedMessage, pinKey, safeNext, sessionSecret } from '@/lib/auth';
import { db } from '@/lib/db';
import { adminPinMatches, encryptPin, guestPinMatches, isAdminPin, isGuestPin, pinFingerprint } from '@/lib/pin';
import { ADMIN_TTL, cookieOptions, SESSION_COOKIE, SESSION_TTL, signSession } from '@/lib/session';

export type JoinState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sets a first PIN or checks an existing one, then signs the guest in for 30 days.
// The organizer enters the 6-digit admin PIN instead, which also opens the 12-hour admin window.
// This is the one action that runs without requireGuest(): it is how a visitor becomes a guest.
export async function joinAsGuest(_prev: JoinState, form: FormData): Promise<JoinState> {
  if (!(await hasEventCookie())) return { error: 'Open the site from the group-chat link first.' };

  const guestId = String(form.get('guestId') ?? '');
  const pin = String(form.get('pin') ?? '');
  const next = safeNext(form.get('next'));
  if (!UUID.test(guestId)) return { error: 'Pick your name first.' };

  const { data: guest, error } = await db()
    .from('guests')
    .select('id, pin_enc, failed_attempts, locked_until, is_admin')
    .eq('id', guestId)
    .maybeSingle();
  if (error) throw error;
  if (!guest) return { error: 'That name is not on the list. Ask Dorian.' };
  // Same form and messages for every name, so nothing shows which one is the organizer.
  if (!/^\d{4,6}$/.test(pin)) return { error: 'Wrong PIN.' };

  const locked = lockedMessage(guest.locked_until);
  if (locked) return { error: locked };

  if (guest.is_admin) {
    const hash = adminPinHash();
    if (!isAdminPin(pin) || !(await adminPinMatches(hash, pin))) return wrongPin(guestId);
    if (guest.failed_attempts > 0) await db().from('guests').update({ failed_attempts: 0 }).eq('id', guestId);
    const adminUntil = Math.floor(Date.now() / 1000) + ADMIN_TTL;
    return signIn(guestId, pinFingerprint(hash), adminUntil, next);
  }

  let stored: string = guest.pin_enc;
  if (guest.pin_enc === null) {
    if (!isGuestPin(pin)) return { error: 'Your PIN is 4 digits.' };
    if (pin !== String(form.get('confirm') ?? '')) return { error: 'The two PINs do not match.' };
    stored = encryptPin(pin, pinKey());
    // Only if still unset, so two people picking the same new name cannot both claim it.
    const { data: claimed, error: setError } = await db()
      .from('guests')
      .update({ pin_enc: stored, failed_attempts: 0, locked_until: null })
      .eq('id', guestId)
      .is('pin_enc', null)
      .select('id');
    if (setError) throw setError;
    if (!claimed?.length) return { error: 'This name just got a PIN. Go back and enter it.' };
  } else if (!isGuestPin(pin) || !guestPinMatches(guest.pin_enc, pin, pinKey())) {
    return wrongPin(guestId);
  } else if (guest.failed_attempts > 0) {
    await db().from('guests').update({ failed_attempts: 0 }).eq('id', guestId);
  }

  return signIn(guestId, pinFingerprint(stored), null, next);
}

// Counts the wrong try. The 5th (10th for the organizer) locks the name for 10 minutes.
async function wrongPin(guestId: string): Promise<JoinState> {
  const { data: lockedUntil, error } = await db().rpc('record_pin_failure', { p_guest: guestId });
  if (error) throw error;
  return { error: lockedMessage(lockedUntil) ?? 'Wrong PIN.' };
}

async function signIn(guestId: string, pinVersion: string, adminUntil: number | null, next: string): Promise<never> {
  const token = await signSession({ guestId, pinVersion, adminUntil }, sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL));
  redirect(next);
}
