import { describe, expect, it } from 'vitest';
import { formatClock, formatStamp, pacificToUtc } from './time';

describe('pacificToUtc', () => {
  it('converts PST (UTC-8) wall clock to UTC', () => {
    expect(new Date(pacificToUtc('2026-12-18T19:00')).toISOString()).toBe('2026-12-19T03:00:00.000Z');
  });

  it('converts PDT (UTC-7) wall clock to UTC', () => {
    expect(new Date(pacificToUtc('2026-07-04T12:00')).toISOString()).toBe('2026-07-04T19:00:00.000Z');
  });

  it('rejects a malformed time', () => {
    expect(() => pacificToUtc('2026-12-18 19:00')).toThrow();
  });
});

describe('formatting', () => {
  it('formats a clock in Pacific time', () => {
    expect(formatClock('2026-12-18T19:00')).toEqual({ clock: '7:00', period: 'PM' });
    expect(formatClock('2026-12-19T01:00')).toEqual({ clock: '1:00', period: 'AM' });
  });

  it('formats the updated stamp', () => {
    expect(formatStamp('2026-11-25T21:00')).toBe('Nov 25, 9:00 PM');
  });
});
