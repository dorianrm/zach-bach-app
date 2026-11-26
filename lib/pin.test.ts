import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  adminPinMatches,
  decryptPin,
  encryptPin,
  guestPinMatches,
  hashAdminPin,
  isAdminPin,
  isGuestPin,
  parseKey,
} from './pin';

const key = randomBytes(32);

describe('PIN format', () => {
  it('accepts exactly 4 digits for guests and 6 for admin', () => {
    expect(isGuestPin('0420')).toBe(true);
    expect(['042', '04200', '04a0', ' 0420', ''].some(isGuestPin)).toBe(false);
    expect(isAdminPin('123456')).toBe(true);
    expect(isAdminPin('12345')).toBe(false);
  });
});

describe('guest PIN encryption', () => {
  it('round-trips and matches', () => {
    const stored = encryptPin('0420', key);
    expect(decryptPin(stored, key)).toBe('0420');
    expect(guestPinMatches(stored, '0420', key)).toBe(true);
    expect(guestPinMatches(stored, '0421', key)).toBe(false);
  });

  it('uses a new IV each time', () => {
    expect(encryptPin('0420', key)).not.toBe(encryptPin('0420', key));
  });

  it('rejects a changed ciphertext', () => {
    const [v, iv, tag, ct] = encryptPin('0420', key).split('.');
    const flipped = Buffer.from(ct, 'base64url');
    flipped[0] ^= 1;
    expect(() => decryptPin([v, iv, tag, flipped.toString('base64url')].join('.'), key)).toThrow();
  });

  it('rejects the wrong key', () => {
    expect(() => decryptPin(encryptPin('0420', key), randomBytes(32))).toThrow();
  });

  it('requires a 32-byte key', () => {
    expect(() => parseKey(randomBytes(16).toString('base64'))).toThrow();
    expect(() => parseKey(undefined)).toThrow();
    expect(parseKey(key.toString('base64'))).toEqual(key);
  });
});

describe('admin PIN hash', () => {
  it('matches only the right PIN', async () => {
    const stored = await hashAdminPin('482913');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(await adminPinMatches(stored, '482913')).toBe(true);
    expect(await adminPinMatches(stored, '482914')).toBe(false);
  });

  it('salts each hash', async () => {
    expect(await hashAdminPin('482913')).not.toBe(await hashAdminPin('482913'));
  });
});
