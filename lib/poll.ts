import { useEffect, useState } from 'react';

const INTERVAL = 5_000;

// Live data for guest phones: fetches `url` every 5 s while the tab is visible, and once
// right away when the phone comes back to the tab. A failed fetch keeps the last value.
export function usePolled<T>(url: string, initial: T): T {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) setValue(await res.json());
      } catch {
        // Offline for a moment in a bar. The next tick tries again.
      }
    };
    const sync = () => {
      clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === 'visible') {
        void load();
        timer = setInterval(load, INTERVAL);
      }
    };
    // The server rendered `initial`, so the first fetch waits one interval.
    if (document.visibilityState === 'visible') timer = setInterval(load, INTERVAL);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [url]);

  return value;
}
