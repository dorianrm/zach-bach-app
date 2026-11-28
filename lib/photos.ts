import { pacificToUtc } from './time';

// Pure gallery rules, shared by the server actions, the upload form and the tests.

export const BUCKET = 'photos';

// Uploads open Fri Dec 18 6:00 PM and close Sun Dec 20 noon, Pacific.
const OPENS = pacificToUtc('2026-12-18T18:00');
const CLOSES = pacificToUtc('2026-12-20T12:00');

// UPLOADS_OPEN=true skips the window, for testing before the weekend.
export function uploadsOpen(now: number, flag: string | undefined): boolean {
  return flag === 'true' || (now >= OPENS && now < CLOSES);
}

export const uploadsOpenNow = () => uploadsOpen(Date.now(), process.env.UPLOADS_OPEN);

// Photos per pick. Each one gets two signed upload URLs, so this caps one call's work.
export const MAX_PER_UPLOAD = 20;

export const CAPTION_MAX = 140;

// One line, trimmed. Empty means no caption.
export function cleanCaption(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const line = value.replace(/\s+/g, ' ').trim().slice(0, CAPTION_MAX);
  return line || null;
}

// Every photo's two files live under the uploader's folder. The server picks the names,
// so savePhoto() can check that a guest only saves files it handed to them.
export function photoPaths(guestId: string, photoId: string): { path: string; thumbPath: string } {
  return { path: `${guestId}/${photoId}.jpg`, thumbPath: `${guestId}/${photoId}-thumb.jpg` };
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PHOTO_PATH = new RegExp(`^(${UUID})/(${UUID})\\.jpg$`);

// The photo id, if `path` is a full-size path in this guest's folder and `thumbPath` is its pair.
export function ownedPhotoId(guestId: string, path: unknown, thumbPath: unknown): string | null {
  if (typeof path !== 'string' || typeof thumbPath !== 'string') return null;
  const match = PHOTO_PATH.exec(path);
  if (!match || match[1] !== guestId) return null;
  return photoPaths(guestId, match[2]).thumbPath === thumbPath ? match[2] : null;
}

// EXIF DateTimeOriginal, e.g. '2026:12:18 19:05:31'. It has no time zone. Photos are taken
// in Portland, so it is read as Pacific wall clock, whatever zone the phone browser is in.
export function exifToIso(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(raw.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  // Some cameras write '0000:00:00 00:00:00' when the clock was never set.
  if (y === '0000' || mo === '00' || d === '00') return null;
  try {
    return new Date(pacificToUtc(`${y}-${mo}-${d}T${h}:${mi}`)).toISOString();
  } catch {
    return null;
  }
}

// An ISO time from the browser, or null. Anything else is dropped, not trusted.
export function cleanTakenAt(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// Size that fits inside `max` on the long side (full size) or on the short side (thumbnail,
// so it still fills a square grid cell). Never scales up.
export function fitSize(
  width: number,
  height: number,
  max: number,
  side: 'long' | 'short',
): { width: number; height: number } {
  const edge = side === 'long' ? Math.max(width, height) : Math.min(width, height);
  const scale = Math.min(1, max / edge);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
