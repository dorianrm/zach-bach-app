import { currentGuest } from '@/lib/auth';
import { loadBingoWinners } from '@/lib/bingo-card';
import { crawlState } from '@/lib/crawl';

// Polled every 5 s by guest phones while the tab is visible. Joined guests only.
// Reading the session cookie makes this run per request, never at build time.
export async function GET() {
  if (!(await currentGuest())) return Response.json({ error: 'Join first.' }, { status: 401 });
  const [crawl, bingoWinners] = await Promise.all([crawlState(), loadBingoWinners()]);
  return Response.json({ ...crawl, bingoWinners }, { headers: { 'Cache-Control': 'no-store' } });
}
