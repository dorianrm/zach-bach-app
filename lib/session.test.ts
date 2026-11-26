import { randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { isAdmin, parseSecret, signEvent, signSession, verifyEvent, verifySession } from './session';

const secret = new Uint8Array(randomBytes(32));
const guestId = '7d3c1a52-0000-4000-8000-000000000001';
const pinVersion = 'pinfingerprint01';

describe('session cookie', () => {
  it('round-trips a guest session', async () => {
    const token = await signSession({ guestId, pinVersion, adminUntil: null }, secret);
    expect(await verifySession(token, secret)).toEqual({ guestId, pinVersion, adminUntil: null });
  });

  it('rejects a session without a PIN fingerprint', async () => {
    const token = await new SignJWT({ typ: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(guestId)
      .setExpirationTime('1h')
      .sign(secret);
    expect(await verifySession(token, secret)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signSession({ guestId, pinVersion, adminUntil: null }, secret);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ typ: 'session', sub: guestId, pv: pinVersion, adm: 9_999_999_999 })).toString('base64url');
    expect(await verifySession(`${header}.${forged}.${signature}`, secret)).toBeNull();
  });

  it('rejects a changed signature', async () => {
    const token = await signSession({ guestId, pinVersion, adminUntil: null }, secret);
    const last = token.at(-1) === 'A' ? 'B' : 'A';
    expect(await verifySession(token.slice(0, -1) + last, secret)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSession({ guestId, pinVersion, adminUntil: null }, new Uint8Array(randomBytes(32)));
    expect(await verifySession(token, secret)).toBeNull();
  });

  it('rejects an unsigned (alg none) token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ typ: 'session', sub: guestId })).toString('base64url');
    expect(await verifySession(`${header}.${payload}.`, secret)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({ typ: 'session' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(guestId)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(secret);
    expect(await verifySession(token, secret)).toBeNull();
  });

  it('rejects an event token used as a session', async () => {
    expect(await verifySession(await signEvent('code', secret), secret)).toBeNull();
  });

  it('rejects missing and garbage values', async () => {
    expect(await verifySession(undefined, secret)).toBeNull();
    expect(await verifySession('not-a-jwt', secret)).toBeNull();
  });
});

describe('admin window', () => {
  it('is open only before adminUntil', () => {
    const now = 1_000_000;
    expect(isAdmin({ guestId, pinVersion, adminUntil: now + 60 }, now)).toBe(true);
    expect(isAdmin({ guestId, pinVersion, adminUntil: now - 1 }, now)).toBe(false);
    expect(isAdmin({ guestId, pinVersion, adminUntil: null }, now)).toBe(false);
    expect(isAdmin(null, now)).toBe(false);
  });

  it('survives the round-trip', async () => {
    const adminUntil = Math.floor(Date.now() / 1000) + 3600;
    const session = await verifySession(await signSession({ guestId, pinVersion, adminUntil }, secret), secret);
    expect(isAdmin(session)).toBe(true);
  });
});

describe('event cookie', () => {
  it('is valid only for the current event code', async () => {
    const token = await signEvent('zach-2026', secret);
    expect(await verifyEvent(token, 'zach-2026', secret)).toBe(true);
    expect(await verifyEvent(token, 'rotated-code', secret)).toBe(false);
  });

  it('rejects a session token used as an event token', async () => {
    const token = await signSession({ guestId, pinVersion, adminUntil: null }, secret);
    expect(await verifyEvent(token, 'zach-2026', secret)).toBe(false);
  });
});

describe('parseSecret', () => {
  it('requires at least 32 bytes', () => {
    expect(() => parseSecret(randomBytes(16).toString('base64'))).toThrow();
    expect(() => parseSecret(undefined)).toThrow();
  });
});
