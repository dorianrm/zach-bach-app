import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { crawlRows } from '../lib/crawl-rows';
import { ANYTIME, GUESTS, STOPS, TEAMS, testDb } from './env';

const { url, key } = testDb();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function check(label: string, error: unknown) {
  if (error) throw new Error(`${label}: ${JSON.stringify(error)}`);
}

// Replaces every team, guest, stop and challenge in the test database with the fixtures.
export async function loadFixtures() {
  const route = crawlRows(STOPS, ANYTIME);
  check('delete challenges', (await db.from('challenges').delete().not('id', 'is', null)).error);
  check('delete stops', (await db.from('stops').delete().not('id', 'is', null)).error);
  check('delete guests', (await db.from('guests').delete().not('id', 'is', null)).error);
  check('delete teams', (await db.from('teams').delete().not('id', 'is', null)).error);
  check('insert teams', (await db.from('teams').insert(TEAMS)).error);
  check('insert guests', (await db.from('guests').insert(GUESTS)).error);
  check('insert stops', (await db.from('stops').insert(route.stops)).error);
  check('insert challenges', (await db.from('challenges').insert(route.challenges)).error);
}

// Clears every PIN and lock, so each test starts from "nobody has joined".
export async function resetPins() {
  const { error } = await db
    .from('guests')
    .update({ pin_enc: null, failed_attempts: 0, locked_until: null, admin_failed_attempts: 0, admin_locked_until: null })
    .not('id', 'is', null);
  check('reset pins', error);
}

export async function guestId(name: string): Promise<string> {
  const { data, error } = await db.from('guests').select('id').eq('name', name).single();
  check('guest id', error);
  return data!.id;
}

// Hides the teams and stops again, clears every award and the final, so each crawl test
// starts before the reveal.
export async function resetCrawl() {
  check('clear awards', (await db.from('awards').delete().not('id', 'is', null)).error);
  check('hide stops', (await db.from('stops').update({ revealed_at: null }).not('id', 'is', null)).error);
  check(
    'reset settings',
    (
      await db.from('settings').upsert([
        { key: 'teams_revealed', value: false },
        { key: 'crawl_final', value: false },
      ])
    ).error,
  );
}

// Deletes every photo row and every file in the test bucket. Files are listed per guest
// folder, because a failed test can leave files with no row.
export async function resetPhotos() {
  check('delete photos', (await db.from('photos').delete().not('id', 'is', null)).error);
  const bucket = db.storage.from('photos');
  const folders = await bucket.list('', { limit: 1000 });
  check('list folders', folders.error);
  for (const folder of folders.data ?? []) {
    const files = await bucket.list(folder.name, { limit: 1000 });
    check('list files', files.error);
    const paths = (files.data ?? []).map((f) => `${folder.name}/${f.name}`);
    if (paths.length > 0) check('remove files', (await bucket.remove(paths)).error);
  }
}

// The organizer's upload switch (settings.uploads_mode).
export async function setUploadMode(mode: 'auto' | 'open' | 'closed') {
  check('upload mode', (await db.from('settings').upsert({ key: 'uploads_mode', value: mode })).error);
}

export async function photosOf(name: string) {
  const { data, error } = await db
    .from('photos')
    .select('path, thumb_path, caption, taken_at, tag, hidden, guests!inner(name)')
    .eq('guests.name', name);
  check('photos of', error);
  return data!;
}

// Size in bytes of a file in the test bucket.
export async function fileSize(path: string): Promise<number> {
  const { data, error } = await db.storage.from('photos').download(path);
  check('download', error);
  return data!.size;
}

// Deletes every bingo card, so each bingo test starts before anyone opened /bingo.
export async function resetBingo() {
  check('clear bingo cards', (await db.from('bingo_cards').delete().not('guest_id', 'is', null)).error);
}

// A photo row with both files in the bucket, as if the guest had uploaded it.
export async function seedPhoto(
  name: string,
  jpeg: Buffer,
  fields: { caption?: string; tag?: string; hidden?: boolean } = {},
): Promise<{ path: string; thumbPath: string }> {
  const guest = await guestId(name);
  const id = randomUUID();
  const path = `${guest}/${id}.jpg`;
  const thumbPath = `${guest}/${id}-thumb.jpg`;
  const bucket = db.storage.from('photos');
  for (const p of [path, thumbPath]) {
    check('upload', (await bucket.upload(p, jpeg, { contentType: 'image/jpeg' })).error);
  }
  check(
    'insert photo',
    (await db.from('photos').insert({ id, guest_id: guest, path, thumb_path: thumbPath, ...fields })).error,
  );
  return { path, thumbPath };
}

export async function fileExists(path: string): Promise<boolean> {
  const { data, error } = await db.storage.from('photos').exists(path);
  if (error && !data) return false;
  return data;
}

export async function setTeamsRevealed(value: boolean) {
  check('set teams revealed', (await db.from('settings').upsert({ key: 'teams_revealed', value })).error);
}

// An award row written straight to the database, for rows the admin page cannot make yet (bingo, T7).
export async function insertAward(row: { team_id: string; points: number; source: string; note?: string; created_at?: string }) {
  check('insert award', (await db.from('awards').insert(row)).error);
}
