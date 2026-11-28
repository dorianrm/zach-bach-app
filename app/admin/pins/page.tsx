import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { lockedMessage, pinKey, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { decryptPin } from '@/lib/pin';
import { resetPin } from '../actions';

export default function PinsPage() {
  return (
    <PageShell active="more">
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">Guest PINs</h2>
          <a href="/admin" className="text-sm text-link">
            Admin
          </a>
        </div>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <PinList />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function PinList() {
  await requireAdmin('/admin/pins');
  // The organizer signs in with the admin PIN, which lives in Vercel, so the row is left out.
  const { data, error } = await db()
    .from('guests')
    .select('id, name, pin_enc, locked_until')
    .eq('is_admin', false)
    .order('name');
  if (error) throw error;
  const key = pinKey();

  return (
    <ul className="flex flex-col gap-3">
      {(data ?? []).map((g) => {
        const locked = lockedMessage(g.locked_until) !== null;
        return (
          <li key={g.id} className="flex items-center justify-between gap-3 rounded-xl bg-card px-[18px] py-3">
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-text">{g.name}</span>
              {g.pin_enc ? (
                // Hidden until tapped, so the PINs are not on screen in a bar.
                <details className="text-sm text-body">
                  <summary className="cursor-pointer text-link">Show PIN</summary>
                  <span className="font-mono text-lg text-text">{decryptPin(g.pin_enc, key)}</span>
                </details>
              ) : (
                <span className="text-sm text-muted">No PIN yet</span>
              )}
              {locked && <span className="text-sm font-semibold text-highlight">Locked</span>}
            </div>
            {(g.pin_enc || locked) && (
              <form action={resetPin}>
                <input type="hidden" name="guestId" value={g.id} />
                <button
                  type="submit"
                  className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-text"
                >
                  Reset
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
