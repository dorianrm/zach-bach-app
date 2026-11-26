import type { ReactNode } from 'react';

// Small rounded label, such as "Now" or "Final round".
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-highlight px-2 py-[3px] text-[11px] font-semibold uppercase tracking-[0.1em] text-on-highlight">
      {children}
    </span>
  );
}
