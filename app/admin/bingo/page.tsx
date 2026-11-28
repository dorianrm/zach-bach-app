import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { Tag } from '@/components/Tag';
import { requireAdmin } from '@/lib/auth';
import { TILE_COUNT } from '@/lib/bingo';
import { loadBingoBoard } from '@/lib/bingo-card';
import { clearAllBingo, removeBingoWinner } from './actions';
import { ConfirmAction } from './ConfirmAction';

const ordinal = (place: number) => ['1st', '2nd', '3rd'][place - 1];

export default function AdminBingoPage() {
  return (
    <PageShell active="more">
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">Bingo admin</h2>
          <a href="/admin" className="text-sm text-link">
            Admin
          </a>
        </div>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <BingoAdmin />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function BingoAdmin() {
  await requireAdmin('/admin/bingo');
  const board = await loadBingoBoard();

  return (
    <>
      {/* Winners first, so a claim can be checked at the table. */}
      <ul aria-label="Players" className="flex flex-col gap-3">
        {board.map((p) => (
          <li key={p.guestId} className="flex flex-col gap-2 rounded-xl bg-card p-[18px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold text-text">{p.name}</span>
              {p.place ? <Tag>{ordinal(p.place)}</Tag> : p.line && <span className="text-sm text-muted">Line, no place</span>}
            </div>
            <p className="font-mono text-xs font-medium text-muted">
              {p.marked === null ? 'No card yet' : `${p.marked} of ${TILE_COUNT} marked`}
            </p>
            <ConfirmAction
              summary={`Remove ${p.name}'s win`}
              button={`Yes, remove ${p.place ? ordinal(p.place) : ''}`}
              show={p.place !== null}
              pendingLabel="Removing…"
              action={removeBingoWinner}
              guestId={p.guestId}
            >
              Takes back the place and the team&apos;s points, and clears {p.name}&apos;s marks. The other winners keep
              their places. If no one holds a later place, the next line gets this one.
            </ConfirmAction>
          </li>
        ))}
      </ul>

      <ConfirmAction
        summary="Clear all bingo"
        button="Yes, clear every card"
        pendingLabel="Clearing…"
        action={clearAllBingo}
      >
        Deletes every card, place and bingo point. For the reset after testing, before Dec 18. Every guest gets a newly
        shuffled card on their next visit.
      </ConfirmAction>
    </>
  );
}
