'use client';

import { useRef, useState } from 'react';
import { setMark } from './actions';

// `squares` holds tile text by position, null for the free center.
export function BingoCard({ squares, initialMarks }: { squares: (string | null)[]; initialMarks: boolean[] }) {
  const [marks, setMarks] = useState(initialMarks);
  const [failed, setFailed] = useState(false);
  // Taps that the server has not answered yet. Server actions run one at a time, so an
  // early answer does not know about later taps. Only the last answer replaces the card.
  const pending = useRef(0);

  async function tap(position: number) {
    const marked = !marks[position];
    setMarks((m) => m.map((v, i) => (i === position ? marked : v)));
    setFailed(false);
    pending.current++;
    try {
      const saved = await setMark(position, marked);
      if (--pending.current === 0) setMarks(saved);
    } catch {
      pending.current--;
      // Undo the tap on screen, so the card never shows a mark the server did not save.
      setMarks((m) => m.map((v, i) => (i === position ? !marked : v)));
      setFailed(true);
    }
  }

  return (
    <>
      {/* Wider than the page padding, so long tiles get room on a small phone. */}
      <ol aria-label="Your bingo card" className="-mx-3 grid grid-cols-5 gap-1">
        {squares.map((text, i) => {
          const on = marks[i];
          const base = 'flex aspect-square w-full items-center justify-center rounded-lg p-1 text-center';
          const look = on ? 'bg-highlight text-on-highlight' : 'bg-card text-body';
          return (
            <li key={i}>
              {text === null ? (
                <div className={`${base} ${look} text-sm font-bold uppercase`}>Free</div>
              ) : (
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => tap(i)}
                  className={`${base} ${look} text-[11px] leading-[1.15] font-semibold hyphens-auto [overflow-wrap:break-word] focus-visible:outline-2 focus-visible:outline-link`}
                >
                  {text}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {failed && (
        <p role="alert" className="text-sm font-semibold text-highlight">
          Not saved. Check your signal and tap again.
        </p>
      )}
    </>
  );
}
