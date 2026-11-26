import type { ReactNode } from 'react';

export function DayHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">{children}</h2>
  );
}
