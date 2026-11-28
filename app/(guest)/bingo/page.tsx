import { Suspense } from 'react';
import { DayHeading } from '@/components/DayHeading';
import { PageShell } from '@/components/PageShell';
import { bingoTiles } from '@/content/bingo-tiles';
import { requireGuest } from '@/lib/auth';
import { cardSquares, hasLine } from '@/lib/bingo';
import { getOrCreateCard, loadBingoWinners } from '@/lib/bingo-card';
import { BingoCard } from './BingoCard';
import { WinnersBanner } from './WinnersBanner';

export default function BingoPage() {
  return (
    <PageShell active="bingo">
      <section className="flex flex-col gap-3">
        <DayHeading>Dinner bingo</DayHeading>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <BingoContent />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function BingoContent() {
  const me = await requireGuest('/bingo');
  const winners = await loadBingoWinners();
  // Zach does not play. He sees the winners only.
  if (!me.playsBingo) {
    return (
      <>
        <WinnersBanner initial={winners} />
        <p className="rounded-xl bg-card p-[18px] text-[15px] text-body">You are the main event, not a player. Winners show here.</p>
      </>
    );
  }
  const card = await getOrCreateCard(me.id);
  return (
    <>
      <WinnersBanner initial={winners} />
      <p className="text-[15px] leading-normal text-body">Tap a square when it happens. Tap again to undo. First three lines win.</p>
      <BingoCard
        squares={cardSquares(card.tileOrder, bingoTiles)}
        initialMarks={card.marks}
        initialLine={hasLine(card.marks)}
        initialPlace={card.place}
      />
    </>
  );
}
