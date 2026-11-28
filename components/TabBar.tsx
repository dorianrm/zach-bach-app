import type { ReactNode } from 'react';

export type Tab = 'plan' | 'crawl' | 'bingo' | 'photos' | 'more';

const icon = (path: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    {path}
  </svg>
);

// `ready` flips to true as each tab's thread ships (T3, T6, T8).
const tabs: { id: Tab; label: string; href: string; ready: boolean; icon: ReactNode }[] = [
  {
    id: 'plan',
    label: 'Plan',
    href: '/',
    ready: true,
    icon: icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  },
  { id: 'crawl', label: 'Crawl', href: '/crawl', ready: true, icon: icon(<path d="M5 21V4M5 4h11l-2 4 2 4H5" />) },
  {
    id: 'bingo',
    label: 'Bingo',
    href: '/bingo',
    ready: true,
    icon: icon(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>),
  },
  {
    id: 'photos',
    label: 'Photos',
    href: '/photos',
    ready: false,
    icon: icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3.5" /></>),
  },
  // Sign-in and organizer pages (/join, /admin) live behind this tab.
  {
    id: 'more',
    label: 'More',
    href: '/more',
    ready: true,
    icon: icon(<><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>),
  },
];

export function TabBar({ active }: { active: Tab }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 border-t border-line bg-bar pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-[72px] max-w-xl grid-cols-5">
        {tabs.map((tab) => {
          const className = `flex flex-col items-center justify-center gap-1 text-xs font-semibold no-underline ${
            tab.id === active ? 'text-link' : 'text-muted'
          }`;
          if (!tab.ready) {
            return (
              <span key={tab.id} aria-disabled="true" className={className}>
                {tab.icon}
                {tab.label}
              </span>
            );
          }
          return (
            <a key={tab.id} href={tab.href} aria-current={tab.id === active ? 'page' : undefined} className={className}>
              {tab.icon}
              {tab.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
