'use server';

import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { lockedMessage, requireAdmin, requireGuest, sessionSecret } from '@/lib/auth';
import { db } from '@/lib/db';
import { adminPinMatches, isAdminPin, pinFingerprint } from '@/lib/pin';
import { ADMIN_TTL, cookieOptions, SESSION_COOKIE, SESSION_TTL, signSession } from '@/lib/session';

export type AdminLoginState = { error?: string };

// Opens a 12-hour admin window on the current guest session.
// Wrong admin PINs count on the organizer's own guest row, with the same 5-try lockout.
export async function adminLogin(_prev: AdminLoginState, form: FormData): Promise<AdminLoginState> {
  const guest = await requireGuest('/admin');
  if (!guest.isAdmin) return { error: 'This is for the organizer only.' };

  const pin = String(form.get('pin') ?? '');
  if (!isAdminPin(pin)) return { error: 'The admin PIN is 6 digits.' };

  const { data: row, error } = await db().from('guests').select('failed_attempts, locked_until, pin_enc').eq('id', guest.id).single();
  if (error) throw error;
  const locked = lockedMessage(row.locked_until);
  if (locked) return { error: locked };

  const hash = process.env.ADMIN_PIN_HASH;
  if (!hash) throw new Error('ADMIN_PIN_HASH must be set');
  if (!(await adminPinMatches(hash, pin))) {
    const { data: lockedUntil, error: rpcError } = await db().rpc('record_pin_failure', { p_guest: guest.id });
    if (rpcError) throw rpcError;
    return { error: lockedMessage(lockedUntil) ?? 'Wrong admin PIN.' };
  }
  if (row.failed_attempts > 0) await db().from('guests').update({ failed_attempts: 0 }).eq('id', guest.id);

  const adminUntil = Math.floor(Date.now() / 1000) + ADMIN_TTL;
  // requireGuest() passed, so pin_enc is set and matches the current session.
  const token = await signSession(
    { guestId: guest.id, pinVersion: pinFingerprint(row.pin_enc), adminUntil },
    sessionSecret(),
  );
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL));
  redirect('/admin');
}

// Clears the PIN and any lock. The guest sets a new PIN on their next /join.
export async function resetPin(form: FormData): Promise<void> {
  await requireAdmin();
  const guestId = String(form.get('guestId') ?? '');
  const { error } = await db()
    .from('guests')
    .update({ pin_enc: null, failed_attempts: 0, locked_until: null })
    .eq('id', guestId);
  if (error) throw error;
  refresh();
}
