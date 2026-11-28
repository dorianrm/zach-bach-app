import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { requireGuest } from '@/lib/auth';
import { crawlState } from '@/lib/crawl';
import { CrawlView } from './CrawlView';

export default function CrawlPage() {
  return (
    <PageShell active="crawl">
      <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
        <CrawlContent />
      </Suspense>
    </PageShell>
  );
}

async function CrawlContent() {
  const me = await requireGuest('/crawl');
  return <CrawlView initial={await crawlState()} myTeamId={me.teamId} />;
}
