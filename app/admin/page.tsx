import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { getSession, requireGuest, safeNext } from '@/lib/auth';
import { organizerPages } from '@/lib/organizer';
import { isAdmin } from '@/lib/session';
import { AdminLoginForm } from './AdminLoginForm';

export default function AdminPage({ searchParams }: PageProps<'/admin'>) {
  return (
    <PageShell active="more">
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">Admin</h2>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <AdminHome searchParams={searchParams} />
        </Suspense>
      </section>
    </PageShell>
  );
}

// The PIN prompt for the 12-hour admin window. ?next= is the organizer page that sent
// Dorian here, and the PIN returns there.
async function AdminHome({ searchParams }: Pick<PageProps<'/admin'>, 'searchParams'>) {
  const next = safeNext((await searchParams).next);
  const here = next === '/' ? '/admin' : `/admin?next=${encodeURIComponent(next)}`;
  const guest = await requireGuest(here);
  if (!guest.isAdmin) return <p className="text-[15px] text-body">This page is for the organizer only.</p>;
  if (!isAdmin(await getSession())) return <AdminLoginForm next={next === '/' ? '/admin' : next} />;

  return (
    <>
      <p className="text-[15px] text-body">Admin is unlocked on this device for 12 hours.</p>
      <ul className="flex flex-col gap-3">
        {organizerPages.map((p) => (
          <li key={p.href}>
            <a href={p.href} className="flex min-h-14 items-center rounded-xl bg-card px-[18px] text-base font-semibold text-link">
              {p.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
