import 'server-only';
import { db } from './db';
import { parseUploadMode, uploadsOpen, type UploadMode } from './photos';

// The upload switch lives in settings.uploads_mode. No row means 'auto'.
export async function uploadMode(): Promise<UploadMode> {
  const { data, error } = await db().from('settings').select('value').eq('key', 'uploads_mode').maybeSingle();
  if (error) throw error;
  return parseUploadMode(data?.value);
}

export async function uploadStatus(): Promise<{ mode: UploadMode; open: boolean }> {
  const mode = await uploadMode();
  return { mode, open: uploadsOpen(Date.now(), mode) };
}
