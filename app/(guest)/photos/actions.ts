'use server';

import { randomUUID } from 'node:crypto';
import { refresh } from 'next/cache';
import { cards } from '@/content/itinerary';
import { requireAdmin, requireGuest } from '@/lib/auth';
import { db } from '@/lib/db';
import { BUCKET, cleanCaption, cleanTag, cleanTakenAt, MAX_PER_UPLOAD, ownedPhotoId, photoPaths } from '@/lib/photos';
import { uploadStatus } from '@/lib/uploads';

export type UploadTicket = { path: string; thumbPath: string; url: string; thumbUrl: string };
export type TicketsResult = { tickets: UploadTicket[] } | { error: string };

// Two signed upload URLs per photo (full size and thumbnail). Each URL writes one file at a
// path the server picked, inside the guest's own folder, and stops working after 2 hours.
export async function createUploadUrls(count: number): Promise<TicketsResult> {
  const me = await requireGuest('/photos');
  if (!(await uploadStatus()).open) return { error: 'Uploads are closed right now.' };
  if (!Number.isInteger(count) || count < 1 || count > MAX_PER_UPLOAD) {
    return { error: `Pick up to ${MAX_PER_UPLOAD} photos at a time.` };
  }

  const bucket = db().storage.from(BUCKET);
  const tickets = await Promise.all(
    Array.from({ length: count }, async () => {
      const { path, thumbPath } = photoPaths(me.id, randomUUID());
      const [full, thumb] = await Promise.all([bucket.createSignedUploadUrl(path), bucket.createSignedUploadUrl(thumbPath)]);
      if (full.error) throw full.error;
      if (thumb.error) throw thumb.error;
      return { path, thumbPath, url: full.data.signedUrl, thumbUrl: thumb.data.signedUrl };
    }),
  );
  return { tickets };
}

export type SaveInput = { path: string; thumbPath: string; caption: string; takenAt: string | null; tag: string | null };

// Adds the photo to the gallery once both files are in the bucket.
// Not limited to the upload window: a guest who got URLs before it closed can still finish.
export async function savePhoto(input: SaveInput): Promise<{ error?: string }> {
  const me = await requireGuest('/photos');
  const id = ownedPhotoId(me.id, input?.path, input?.thumbPath);
  if (!id) return { error: 'That upload is not yours.' };
  const tag = cleanTag(cards, input.tag);
  if (tag === undefined) return { error: 'Pick a tag from the list.' };

  const bucket = db().storage.from(BUCKET);
  const [full, thumb] = await Promise.all([bucket.exists(input.path), bucket.exists(input.thumbPath)]);
  if (!full.data || !thumb.data) return { error: 'The upload did not finish. Try again.' };

  const { error } = await db()
    .from('photos')
    .insert({
      id,
      guest_id: me.id,
      path: input.path,
      thumb_path: input.thumbPath,
      caption: cleanCaption(input.caption),
      taken_at: cleanTakenAt(input.takenAt),
      tag,
    });
  // 23505: already saved, for example a retry after a dropped answer. Nothing to do.
  if (error && error.code !== '23505') throw error;
  refresh();
  return {};
}

// Owner or organizer. Removes the row first, so the gallery never shows a missing file,
// then both files.
export async function deletePhoto(id: string): Promise<{ error?: string }> {
  const me = await requireGuest('/photos');
  const { data: photo, error } = await db().from('photos').select('guest_id, path, thumb_path').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!photo) return {}; // Already gone, for example deleted on another phone.
  // Someone else's photo needs the organizer's 12-hour admin window, like every admin action.
  if (photo.guest_id !== me.id) await requireAdmin('/photos');

  const removed = await db().from('photos').delete().eq('id', id);
  if (removed.error) throw removed.error;
  const files = await db().storage.from(BUCKET).remove([photo.path, photo.thumb_path]);
  if (files.error) console.error('photo files left in the bucket', id, files.error);
  refresh();
  return {};
}

// Organizer only. Hidden photos are left out for guests.
export async function setHidden(id: string, hidden: boolean): Promise<void> {
  await requireAdmin('/photos');
  const { error } = await db().from('photos').update({ hidden: hidden === true }).eq('id', id);
  if (error) throw error;
  refresh();
}

// Organizer only. A tag from the itinerary list, or null for no tag.
export async function setTag(id: string, value: string | null): Promise<{ error?: string }> {
  await requireAdmin('/photos');
  const tag = cleanTag(cards, value);
  if (tag === undefined) return { error: 'Pick a tag from the list.' };
  const { error } = await db().from('photos').update({ tag }).eq('id', id);
  if (error) throw error;
  refresh();
  return {};
}
