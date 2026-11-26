import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { getSession, requireGuest } from '@/lib/auth';
import { isAdmin } from '@/lib/session';
import { AdminLoginForm } from './AdminLoginForm';

export default function AdminPage() {
  return (
    <PageShell>
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">Admin</h2>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <AdminHome />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function AdminHome() {
  const guest = await requireGuest('/admin');
  if (!guest.isAdmin) return <p className="text-[15px] text-body">This page is for the organizer only.</p>;
  if (!isAdmin(await getSession())) return <AdminLoginForm />;

  return (
    <>
      <p className="text-[15px] text-body">Admin is unlocked on this device for 12 hours.</p>
      <ul className="flex flex-col gap-3">
        <li>
          <a href="/admin/pins" className="flex min-h-14 items-center rounded-xl bg-card px-[18px] text-base font-semibold text-link">
            Guest PINs
          </a>
        </li>
      </ul>
    </>
  );
}
