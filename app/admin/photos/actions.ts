'use server';

import { refresh } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { UPLOAD_MODES } from '@/lib/photos';

// Opens or closes uploads for every guest. Guest pages read it on their next load.
export async function setUploadMode(form: FormData): Promise<void> {
  await requireAdmin('/admin/photos');
  const mode = UPLOAD_MODES.find((m) => m === form.get('mode'));
  if (!mode) return;
  const { error } = await db().from('settings').upsert({ key: 'uploads_mode', value: mode });
  if (error) throw error;
  refresh();
}
