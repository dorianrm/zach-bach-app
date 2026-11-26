import { connection } from 'next/server';
import { db } from '@/lib/db';

// Hit daily by the Vercel cron (vercel.json) so the free Supabase project does not pause.
export async function GET() {
  await connection(); // Never prerender: it must hit the database on every call.
  try {
    const { data, error } = await db().from('settings').select('key').eq('key', 'health').single();
    if (error || !data) throw error ?? new Error('health row missing');
    return Response.json({ ok: true });
  } catch (err) {
    console.error('health check failed', err);
    return Response.json({ ok: false }, { status: 503 });
  }
}
