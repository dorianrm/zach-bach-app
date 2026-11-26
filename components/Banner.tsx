import type { ReactNode } from 'react';

// Full-width notice, such as bingo winners or the crawl winner.
export function Banner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="rounded-xl bg-highlight px-[18px] py-4 text-[15px] font-semibold text-on-highlight">
      {children}
    </div>
  );
}
