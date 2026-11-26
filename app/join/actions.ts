'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasEventCookie, pinKey, safeNext, sessionSecret } from '@/lib/auth';
import { db } from '@/lib/db';
import { encryptPin, guestPinMatches, isGuestPin } from '@/lib/pin';
import { cookieOptions, SESSION_COOKIE, SESSION_TTL, signSession } from '@/lib/session';

export type JoinState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lockedMessage(until: string): string | null {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / 60_000);
  return `Too many wrong tries. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or ask Dorian.`;
}

// Sets a first PIN or checks an existing one, then signs the guest in for 30 days.
// This is the one action that runs without requireGuest(): it is how a visitor becomes a guest.
export async function joinAsGuest(_prev: JoinState, form: FormData): Promise<JoinState> {
  if (!(await hasEventCookie())) return { error: 'Open the site from the group-chat link first.' };

  const guestId = String(form.get('guestId') ?? '');
  const pin = String(form.get('pin') ?? '');
  const next = safeNext(form.get('next'));
  if (!UUID.test(guestId)) return { error: 'Pick your name first.' };
  if (!isGuestPin(pin)) return { error: 'Your PIN is 4 digits.' };

  const { data: guest, error } = await db()
    .from('guests')
    .select('id, pin_enc, failed_attempts, locked_until')
    .eq('id', guestId)
    .maybeSingle();
  if (error) throw error;
  if (!guest) return { error: 'That name is not on the list. Ask Dorian.' };

  const locked = guest.locked_until && lockedMessage(guest.locked_until);
  if (locked) return { error: locked };

  if (guest.pin_enc === null) {
    if (pin !== String(form.get('confirm') ?? '')) return { error: 'The two PINs do not match.' };
    // Only if still unset, so two people picking the same new name cannot both claim it.
    const { data: claimed, error: setError } = await db()
      .from('guests')
      .update({ pin_enc: encryptPin(pin, pinKey()), failed_attempts: 0, locked_until: null })
      .eq('id', guestId)
      .is('pin_enc', null)
      .select('id');
    if (setError) throw setError;
    if (!claimed?.length) return { error: 'This name just got a PIN. Go back and enter it.' };
  } else if (!guestPinMatches(guest.pin_enc, pin, pinKey())) {
    const { data: lockedUntil, error: rpcError } = await db().rpc('record_pin_failure', { p_guest: guestId });
    if (rpcError) throw rpcError;
    return { error: (lockedUntil && lockedMessage(lockedUntil)) || 'Wrong PIN.' };
  } else if (guest.failed_attempts > 0) {
    await db().from('guests').update({ failed_attempts: 0 }).eq('id', guestId);
  }

  const token = await signSession({ guestId, adminUntil: null }, sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL));
  redirect(next);
}
