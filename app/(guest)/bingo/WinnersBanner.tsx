'use client';

import { Banner } from '@/components/Banner';
import type { BingoWinner } from '@/lib/bingo-card';
import { usePolled } from '@/lib/poll';

export const ordinal = (place: number) => ['1st', '2nd', '3rd'][place - 1];

// 1st, 2nd and 3rd on every phone, within ~5 s of each win.
export function WinnersBanner({ initial }: { initial: BingoWinner[] }) {
  const { bingoWinners } = usePolled('/api/state', { bingoWinners: initial });
  if (bingoWinners.length === 0) return null;
  return (
    <Banner>
      <p>Bingo winners</p>
      <ol aria-label="Bingo winners" className="font-normal">
        {bingoWinners.map((w) => (
          <li key={w.place}>
            {ordinal(w.place)}: {w.name}
          </li>
        ))}
      </ol>
    </Banner>
  );
}
