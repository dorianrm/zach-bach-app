import { describe, expect, it } from 'vitest';
import { cleanCaption, cleanTakenAt, exifToIso, fitSize, ownedPhotoId, parseUploadMode, photoPaths, uploadsOpen } from './photos';
import { pacificToUtc } from './time';

const GUEST = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PHOTO = '33333333-3333-4333-8333-333333333333';

describe('uploadsOpen', () => {
  const at = (local: string) => pacificToUtc(local);

  it('opens Fri Dec 18 at 6:00 PM Pacific', () => {
    expect(uploadsOpen(at('2026-12-18T17:59'), 'auto')).toBe(false);
    expect(uploadsOpen(at('2026-12-18T18:00'), 'auto')).toBe(true);
  });

  it('closes at the end of Sun Dec 27 Pacific', () => {
    expect(uploadsOpen(at('2026-12-27T23:59'), 'auto')).toBe(true);
    expect(uploadsOpen(at('2026-12-28T00:00'), 'auto')).toBe(false);
  });

  it("'open' opens it any day, 'closed' closes it inside the window", () => {
    expect(uploadsOpen(at('2026-11-27T12:00'), 'open')).toBe(true);
    expect(uploadsOpen(at('2026-12-19T12:00'), 'closed')).toBe(false);
  });

  it("reads a missing or unknown setting as 'auto'", () => {
    expect(parseUploadMode(undefined)).toBe('auto');
    expect(parseUploadMode('true')).toBe('auto');
    expect(parseUploadMode(true)).toBe('auto');
    expect(parseUploadMode('open')).toBe('open');
    expect(parseUploadMode('closed')).toBe('closed');
  });
});

describe('ownedPhotoId', () => {
  const { path, thumbPath } = photoPaths(GUEST, PHOTO);

  it('accepts the pair the server handed out', () => {
    expect(ownedPhotoId(GUEST, path, thumbPath)).toBe(PHOTO);
  });

  it("rejects another guest's files", () => {
    expect(ownedPhotoId(OTHER, path, thumbPath)).toBeNull();
  });

  it('rejects a mismatched thumbnail, path tricks and non-strings', () => {
    expect(ownedPhotoId(GUEST, path, photoPaths(GUEST, OTHER).thumbPath)).toBeNull();
    expect(ownedPhotoId(GUEST, thumbPath, thumbPath)).toBeNull();
    expect(ownedPhotoId(GUEST, `${GUEST}/../${OTHER}/${PHOTO}.jpg`, thumbPath)).toBeNull();
    expect(ownedPhotoId(GUEST, `x${path}`, thumbPath)).toBeNull();
    expect(ownedPhotoId(GUEST, undefined, thumbPath)).toBeNull();
  });
});

describe('exifToIso', () => {
  it('reads EXIF time as Pacific wall clock', () => {
    expect(exifToIso('2026:12:18 19:05:31')).toBe('2026-12-19T03:05:00.000Z');
  });

  it('returns null for missing or broken values', () => {
    expect(exifToIso(undefined)).toBeNull();
    expect(exifToIso('0000:00:00 00:00:00')).toBeNull();
    expect(exifToIso('yesterday')).toBeNull();
  });
});

describe('cleanCaption and cleanTakenAt', () => {
  it('keeps one trimmed line of up to 140 characters', () => {
    expect(cleanCaption('  Zach\nat   the bar ')).toBe('Zach at the bar');
    expect(cleanCaption('x'.repeat(200))).toHaveLength(140);
    expect(cleanCaption('   ')).toBeNull();
    expect(cleanCaption(42)).toBeNull();
  });

  it('keeps a real time and drops anything else', () => {
    expect(cleanTakenAt('2026-12-19T03:05:00.000Z')).toBe('2026-12-19T03:05:00.000Z');
    expect(cleanTakenAt('nope')).toBeNull();
    expect(cleanTakenAt(null)).toBeNull();
  });
});

describe('fitSize', () => {
  it('fits the long side for full size', () => {
    expect(fitSize(4032, 3024, 2000, 'long')).toEqual({ width: 2000, height: 1500 });
    expect(fitSize(3024, 4032, 2000, 'long')).toEqual({ width: 1500, height: 2000 });
  });

  it('fits the short side for thumbnails', () => {
    expect(fitSize(4032, 3024, 400, 'short')).toEqual({ width: 533, height: 400 });
  });

  it('never scales up', () => {
    expect(fitSize(300, 200, 2000, 'long')).toEqual({ width: 300, height: 200 });
  });
});
