// Loads content/guests.ts and content/crawl.ts into the database. Safe to re-run.
// Run: npm run seed  (reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local)
//
// - Teams, guests, stops and challenges are upserted. Guest PINs, failed attempts, locks
//   and stop reveals are never touched.
// - Rows that are no longer in content/ are deleted, and the script lists them.

import { createClient } from '@supabase/supabase-js';
import { anytime, stops } from '../content/crawl.ts';
import { guests, teams } from '../content/guests.ts';
import { crawlRows } from '../lib/crawl-rows.ts';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const teamIds = new Set(teams.map((t) => t.id));
for (const g of guests) {
  if (g.team && !teamIds.has(g.team)) throw new Error(`${g.name}: unknown team '${g.team}'`);
}

function check<T>(label: string, result: { data: T; error: unknown }): T {
  if (result.error) throw new Error(`${label}: ${JSON.stringify(result.error)}`);
  return result.data;
}

check(
  'upsert teams',
  await db.from('teams').upsert(teams.map((t, i) => ({ id: t.id, name: t.name, color: t.color, sort: i }))),
);

check(
  'upsert guests',
  await db.from('guests').upsert(
    guests.map((g) => ({
      name: g.name,
      team_id: g.team ?? null,
      is_admin: g.isAdmin ?? false,
      plays_bingo: g.playsBingo ?? true,
    })),
    { onConflict: 'name' },
  ),
);

const existingGuests = check('list guests', await db.from('guests').select('name')) ?? [];
const goneGuests = existingGuests.map((g) => g.name).filter((n) => !guests.some((g) => g.name === n));
if (goneGuests.length > 0) {
  check('delete guests', await db.from('guests').delete().in('name', goneGuests));
  console.log('Deleted guests:', goneGuests.join(', '));
}

const existingTeams = check('list teams', await db.from('teams').select('id')) ?? [];
const goneTeams = existingTeams.map((t) => t.id).filter((id) => !teamIds.has(id));
if (goneTeams.length > 0) {
  check('delete teams', await db.from('teams').delete().in('id', goneTeams));
  console.log('Deleted teams:', goneTeams.join(', '));
}

// Crawl: stops first, since challenges point at them. Then remove what content dropped:
// challenges before stops. Awards keep their points when a challenge goes away.
const crawl = crawlRows(stops, anytime);
check('upsert stops', await db.from('stops').upsert(crawl.stops));
check('upsert challenges', await db.from('challenges').upsert(crawl.challenges));

const existingChallenges = check('list challenges', await db.from('challenges').select('id')) ?? [];
const goneChallenges = existingChallenges.map((c) => c.id).filter((id) => !crawl.challenges.some((c) => c.id === id));
if (goneChallenges.length > 0) {
  check('delete challenges', await db.from('challenges').delete().in('id', goneChallenges));
  console.log('Deleted challenges:', goneChallenges.join(', '));
}

const existingStops = check('list stops', await db.from('stops').select('id')) ?? [];
const goneStops = existingStops.map((s) => s.id).filter((id) => !crawl.stops.some((s) => s.id === id));
if (goneStops.length > 0) {
  check('delete stops', await db.from('stops').delete().in('id', goneStops));
  console.log('Deleted stops:', goneStops.join(', '));
}

console.log(
  `Seeded ${teams.length} teams, ${guests.length} guests, ${crawl.stops.length} stops and ${crawl.challenges.length} challenges.`,
);
