'use client';

import { useState } from 'react';
import { Button } from './Button';
import { DayHeading } from './DayHeading';

export type CalendarEvent = { tag: string; title: string; when: string; googleUrl: string };

type Mode = 'apple' | 'google';

const tab = 'min-h-11 flex-1 rounded-full border text-[15px] font-semibold';
const row = 'flex min-h-12 items-center gap-3 border-t border-line py-2 text-[15px] text-text first:border-t-0';

// Apple: tick the events, then one calendar file holds them all.
// Google: a link holds one event, and phones block opening several tabs, so each event has its own link.
export function CalendarPicker({ events }: { events: CalendarEvent[] }) {
  const [mode, setMode] = useState<Mode>('apple');
  const [picked, setPicked] = useState(() => new Set(events.map((e) => e.tag)));

  const toggle = (tag: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(tag)) next.add(tag);
      return next;
    });
  // Content order, so the file lists events by time.
  const chosen = events.filter((e) => picked.has(e.tag));

  return (
    <section className="flex flex-col gap-3">
      <DayHeading>Add to calendar</DayHeading>
      <div className="flex gap-3" role="group" aria-label="Calendar app">
        {(['apple', 'google'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`${tab} ${mode === m ? 'border-link text-link' : 'border-line text-muted'}`}
          >
            {m === 'apple' ? 'Apple Calendar' : 'Google Calendar'}
          </button>
        ))}
      </div>

      <div className="flex flex-col rounded-xl bg-card px-[18px] py-2">
        {mode === 'apple'
          ? events.map((e) => (
              <label key={e.tag} className={row}>
                <input
                  type="checkbox"
                  checked={picked.has(e.tag)}
                  onChange={() => toggle(e.tag)}
                  className="size-5 shrink-0 accent-link"
                />
                <Event event={e} />
              </label>
            ))
          : events.map((e) => (
              <div key={e.tag} className={row}>
                <Event event={e} />
                <a
                  href={e.googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Add ${e.title} to Google Calendar`}
                  className="flex min-h-11 shrink-0 items-center font-semibold text-link"
                >
                  Add ↗
                </a>
              </div>
            ))}
      </div>

      {mode === 'apple' &&
        (chosen.length > 0 ? (
          <Button
            variant="secondary"
            href={`/api/calendar.ics?events=${chosen.map((e) => encodeURIComponent(e.tag)).join(',')}`}
            className="h-12 w-full"
          >
            Add {chosen.length} event{chosen.length === 1 ? '' : 's'}
          </Button>
        ) : (
          <p className="text-sm text-muted">Pick at least one event.</p>
        ))}
    </section>
  );
}

function Event({ event }: { event: CalendarEvent }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="font-mono text-xs text-muted">{event.when}</span>
      <span className="truncate">{event.title}</span>
    </span>
  );
}
