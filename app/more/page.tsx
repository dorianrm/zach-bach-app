import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

const linkClass = 'flex min-h-14 items-center rounded-xl bg-card px-[18px] text-base font-semibold text-link';

// Shortcuts to pages that have no tab of their own. Add new organizer pages here.
export default function MorePage() {
  return (
    <PageShell active="more">
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">More</h2>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <MoreLinks />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function MoreLinks() {
  const session = await getSession();
  const { data: me } = session
    ? await db().from('guests').select('name, is_admin').eq('id', session.guestId).maybeSingle()
    : { data: null };

  return (
    <>
      <p className="text-[15px] text-body">
        {me ? (
          <>
            Signed in as <span className="font-semibold text-text">{me.name}</span>.
          </>
        ) : (
          'Not signed in yet.'
        )}
      </p>
      <ul className="flex flex-col gap-3">
        <li>
          <a href="/join" className={linkClass}>
            {me ? 'Switch guest' : 'Join with your name'}
          </a>
        </li>
        {/* Only the organizer sees the admin link. /admin checks again on the server. */}
        {me?.is_admin && (
          <li>
            <a href="/admin" className={linkClass}>
              Admin
            </a>
          </li>
        )}
      </ul>
    </>
  );
}
