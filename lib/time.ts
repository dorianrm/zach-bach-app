// Every time on the site is Pacific, whatever the phone's time zone.
export const TIME_ZONE = 'America/Los_Angeles';

const offsetFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  timeZoneName: 'longOffset',
});

// Pacific UTC offset in minutes at a given instant, e.g. -480 for PST.
function pacificOffsetMinutes(utcMs: number): number {
  const name = offsetFormat.formatToParts(utcMs).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

// '2026-12-18T19:00' (Pacific wall clock) to epoch ms.
export function pacificToUtc(local: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error(`Bad Pacific time: ${local}`);
  const [, y, mo, d, h, mi] = match.map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  return asUtc - pacificOffsetMinutes(asUtc) * 60_000;
}

const clockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

// { clock: '7:00', period: 'PM' }
export function formatClock(local: string): { clock: string; period: string } {
  const parts = clockFormat.formatToParts(pacificToUtc(local));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { clock: `${get('hour')}:${get('minute')}`, period: get('dayPeriod') };
}

const stampFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// 'Nov 25, 9:00 PM'
export function formatStamp(local: string): string {
  return stampFormat.format(pacificToUtc(local)).replace(' at ', ', ');
}
