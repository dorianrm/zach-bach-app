'use server';

import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminPinHash, lockedMessage, requireAdmin, requireGuest, sessionSecret } from '@/lib/auth';
import { db } from '@/lib/db';
import { adminPinMatches, isAdminPin, pinFingerprint } from '@/lib/pin';
import { ADMIN_TTL, cookieOptions, SESSION_COOKIE, SESSION_TTL, signSession } from '@/lib/session';

export type AdminLoginState = { error?: string };

// Re-opens the 12-hour admin window on a phone already signed in as the organizer.
// Wrong tries here use their own counter (10 tries), so wrong tries at /join cannot block it.
export async function adminLogin(_prev: AdminLoginState, form: FormData): Promise<AdminLoginState> {
  const guest = await requireGuest('/admin');
  if (!guest.isAdmin) return { error: 'This is for the organizer only.' };

  const pin = String(form.get('pin') ?? '');
  if (!isAdminPin(pin)) return { error: 'The admin PIN is 6 digits.' };

  const { data: row, error } = await db().from('guests').select('admin_failed_attempts, admin_locked_until').eq('id', guest.id).single();
  if (error) throw error;
  const locked = lockedMessage(row.admin_locked_until);
  if (locked) return { error: locked };

  const hash = adminPinHash();
  if (!(await adminPinMatches(hash, pin))) {
    const { data: lockedUntil, error: rpcError } = await db().rpc('record_admin_failure', { p_guest: guest.id });
    if (rpcError) throw rpcError;
    return { error: lockedMessage(lockedUntil) ?? 'Wrong admin PIN.' };
  }
  if (row.admin_failed_attempts > 0) await db().from('guests').update({ admin_failed_attempts: 0 }).eq('id', guest.id);

  const adminUntil = Math.floor(Date.now() / 1000) + ADMIN_TTL;
  const token = await signSession({ guestId: guest.id, pinVersion: pinFingerprint(hash), adminUntil }, sessionSecret());
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
