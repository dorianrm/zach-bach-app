import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (pin: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const isGuestPin = (pin: string) => /^\d{4}$/.test(pin);
export const isAdminPin = (pin: string) => /^\d{6}$/.test(pin);

// PIN_ENCRYPTION_KEY and the ADMIN_PIN_HASH salt are base64. The key must decode to 32 bytes.
export function parseKey(base64: string | undefined): Buffer {
  const key = Buffer.from(base64 ?? '', 'base64');
  if (key.length !== 32) throw new Error('PIN_ENCRYPTION_KEY must be 32 bytes, base64');
  return key;
}

// Guest PINs are encrypted, not hashed, so the organizer can view them on /admin/pins.
// Format: v1.<iv>.<auth tag>.<ciphertext>, each base64url.
export function encryptPin(pin: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(pin, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), ciphertext].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

// Throws if the value was changed or the key is wrong (GCM auth tag check).
export function decryptPin(stored: string, key: Buffer): string {
  const [version, iv, tag, ciphertext] = stored.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Unknown PIN format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

// Short digest of the stored (encrypted) PIN, kept in the session cookie.
// A reset or a new PIN changes it, which signs out every session made with the old PIN.
export function pinFingerprint(stored: string): string {
  return createHash('sha256').update(stored).digest('base64url').slice(0, 16);
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function guestPinMatches(stored: string, pin: string, key: Buffer): boolean {
  return safeEqual(Buffer.from(decryptPin(stored, key)), Buffer.from(pin));
}

// Admin PIN: scrypt hash, stored only in Vercel as ADMIN_PIN_HASH.
// Format: scrypt:N:r:p:<salt>:<hash>, salt and hash base64.
// ':' not '$': Next.js expands $NAME inside .env files, which would corrupt a '$'-separated hash.
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashAdminPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, 32, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join(':');
}

export async function adminPinMatches(stored: string, pin: string): Promise<boolean> {
  const [kind, n, r, p, salt, hash] = stored.split(':');
  if (kind !== 'scrypt' || !salt || !hash) throw new Error('ADMIN_PIN_HASH has an unknown format');
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(pin, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return safeEqual(actual, expected);
}
