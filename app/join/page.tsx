import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { getSession, safeNext } from '@/lib/auth';
import { db } from '@/lib/db';
import { JoinForm } from './JoinForm';

export default function JoinPage({ searchParams }: PageProps<'/join'>) {
  return (
    <PageShell active="more">
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">Who are you?</h2>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading the guest list…</p>}>
          <JoinContent searchParams={searchParams} />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function JoinContent({ searchParams }: Pick<PageProps<'/join'>, 'searchParams'>) {
  const next = safeNext((await searchParams).next);
  const [session, { data, error }] = await Promise.all([
    getSession(),
    db().from('guests').select('id, name, pin_enc').order('name'),
  ]);
  if (error) throw error;

  // Only whether a PIN exists reaches the browser, never the PIN itself.
  const guests = (data ?? []).map((g) => ({ id: g.id as string, name: g.name as string, hasPin: g.pin_enc !== null }));
  const me = session && guests.find((g) => g.id === session.guestId);

  return (
    <>
      {me && (
        <p className="text-[15px] text-body">
          You are signed in as <span className="font-semibold text-text">{me.name}</span>.{' '}
          <a href={next} className="text-link">
            Continue
          </a>
        </p>
      )}
      <JoinForm guests={guests} next={next} />
    </>
  );
}
