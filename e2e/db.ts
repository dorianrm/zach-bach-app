import { createClient } from '@supabase/supabase-js';
import { GUESTS, TEAMS, testDb } from './env';

const { url, key } = testDb();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function check(label: string, error: unknown) {
  if (error) throw new Error(`${label}: ${JSON.stringify(error)}`);
}

// Replaces every team and guest in the test database with the fixtures.
export async function loadFixtures() {
  check('delete guests', (await db.from('guests').delete().not('id', 'is', null)).error);
  check('delete teams', (await db.from('teams').delete().not('id', 'is', null)).error);
  check('insert teams', (await db.from('teams').insert(TEAMS)).error);
  check('insert guests', (await db.from('guests').insert(GUESTS)).error);
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

// Hides the teams again and clears every award, so each crawl test starts before the reveal.
export async function resetCrawl() {
  check('clear awards', (await db.from('awards').delete().not('id', 'is', null)).error);
  check('hide teams', (await db.from('settings').upsert({ key: 'teams_revealed', value: false })).error);
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

export async function photosOf(name: string) {
  const { data, error } = await db
    .from('photos')
    .select('path, thumb_path, caption, taken_at, guests!inner(name)')
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
