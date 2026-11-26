import type { ReactNode } from 'react';
import { TabBar, type Tab } from './TabBar';

type Props = {
  active: Tab;
  headerAside?: ReactNode; // Bottom row of the header, e.g. updated stamp + Venmo.
  children: ReactNode;
};

export function PageShell({ active, headerAside, children }: Props) {
  return (
    <>
      <header className="border-b border-line bg-hero text-hero-text">
        <div className="mx-auto flex max-w-xl flex-col gap-3.5 px-6 pt-9 pb-7">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-highlight">The bachelor weekend</p>
          <h1 className="text-[52px] leading-[0.95] font-bold font-stretch-condensed uppercase tracking-[0.01em]">
            Zach Attack
          </h1>
          <p className="text-[15px] text-hero-muted">Dec 18-19 · Portland and Hillsboro</p>
          {headerAside && <div className="flex items-center justify-between gap-3 pt-2">{headerAside}</div>}
        </div>
      </header>
      {/* Bottom padding clears the fixed tab bar. */}
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 pt-7 pb-[calc(72px+28px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <TabBar active={active} />
    </>
  );
}
