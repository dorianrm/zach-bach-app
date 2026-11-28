'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { BUCKET, UPLOAD_MODES } from '@/lib/photos';

// Opens or closes uploads for every guest. Guest pages read it on their next load.
export async function setUploadMode(form: FormData): Promise<void> {
  await requireAdmin('/admin/photos');
  const mode = UPLOAD_MODES.find((m) => m === form.get('mode'));
  if (!mode) return;
  const { error } = await db().from('settings').upsert({ key: 'uploads_mode', value: mode });
  if (error) throw error;
  refresh();
}

// Pre-event reset: clears test photos (Vercel previews use the real database) with no SQL.
// Rows go first, so the gallery never shows a missing file. Files are listed per guest
// folder, which also catches files from uploads that never finished.
export async function deleteAllPhotos(): Promise<void> {
  await requireAdmin('/admin/photos');
  const rows = await db().from('photos').delete().not('id', 'is', null);
  if (rows.error) throw rows.error;

  const bucket = db().storage.from(BUCKET);
  const folders = await bucket.list('', { limit: 1000 });
  if (folders.error) throw folders.error;
  for (const folder of folders.data) {
    const files = await bucket.list(folder.name, { limit: 1000 });
    if (files.error) throw files.error;
    const paths = files.data.map((f) => `${folder.name}/${f.name}`);
    if (paths.length > 0) {
      const removed = await bucket.remove(paths);
      if (removed.error) throw removed.error;
    }
  }
  refresh();
}
