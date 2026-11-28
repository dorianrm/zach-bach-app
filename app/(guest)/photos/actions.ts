'use server';

import { randomUUID } from 'node:crypto';
import { refresh } from 'next/cache';
import { requireGuest } from '@/lib/auth';
import { db } from '@/lib/db';
import { BUCKET, cleanCaption, cleanTakenAt, MAX_PER_UPLOAD, ownedPhotoId, photoPaths, uploadsOpenNow } from '@/lib/photos';

export type UploadTicket = { path: string; thumbPath: string; url: string; thumbUrl: string };
export type TicketsResult = { tickets: UploadTicket[] } | { error: string };

// Two signed upload URLs per photo (full size and thumbnail). Each URL writes one file at a
// path the server picked, inside the guest's own folder, and stops working after 2 hours.
export async function createUploadUrls(count: number): Promise<TicketsResult> {
  const me = await requireGuest('/photos');
  if (!uploadsOpenNow()) return { error: 'Uploads are closed right now.' };
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

export type SaveInput = { path: string; thumbPath: string; caption: string; takenAt: string | null };

// Adds the photo to the gallery once both files are in the bucket.
// Not limited to the upload window: a guest who got URLs before it closed can still finish.
export async function savePhoto(input: SaveInput): Promise<{ error?: string }> {
  const me = await requireGuest('/photos');
  const id = ownedPhotoId(me.id, input?.path, input?.thumbPath);
  if (!id) return { error: 'That upload is not yours.' };

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
    });
  // 23505: already saved, for example a retry after a dropped answer. Nothing to do.
  if (error && error.code !== '23505') throw error;
  refresh();
  return {};
}
