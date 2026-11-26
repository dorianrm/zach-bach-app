import { jwtVerify, SignJWT } from 'jose';

// Two signed, httpOnly cookies:
// - event:   proves the visitor came through the group-chat link (EVENT_CODE).
// - session: the guest's id, and an admin window after the admin PIN.
// Pure functions: the secret is passed in, so the proxy, server code and tests share them.

export const EVENT_COOKIE = 'event';
export const SESSION_COOKIE = 'session';

const DAY = 24 * 60 * 60;
export const SESSION_TTL = 30 * DAY;
export const ADMIN_TTL = 12 * 60 * 60;

export type Session = {
  guestId: string;
  pinVersion: string; // pinFingerprint() of the guest's PIN at sign-in. See requireGuest().
  adminUntil: number | null; // epoch seconds
};

export function parseSecret(base64: string | undefined): Uint8Array {
  const secret = Buffer.from(base64 ?? '', 'base64');
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 bytes, base64');
  return new Uint8Array(secret);
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

const ALG = 'HS256';

export async function signSession(session: Session, secret: Uint8Array): Promise<string> {
  return new SignJWT({ typ: 'session', pv: session.pinVersion, adm: session.adminUntil })
    .setProtectedHeader({ alg: ALG })
    .setSubject(session.guestId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(secret);
}

// Null for a missing, expired, tampered or wrong-type token.
export async function verifySession(token: string | undefined, secret: Uint8Array): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    if (payload.typ !== 'session' || typeof payload.sub !== 'string' || typeof payload.pv !== 'string') return null;
    return {
      guestId: payload.sub,
      pinVersion: payload.pv,
      adminUntil: typeof payload.adm === 'number' ? payload.adm : null,
    };
  } catch {
    return null;
  }
}

export function isAdmin(session: Session | null, nowSeconds = Date.now() / 1000): boolean {
  return session?.adminUntil != null && session.adminUntil > nowSeconds;
}

// The event token carries a digest of EVENT_CODE. Changing the code in Vercel locks out
// every old link and cookie at once, in case the link leaks.
async function codeDigest(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Buffer.from(digest).toString('base64url');
}

export async function signEvent(code: string, secret: Uint8Array): Promise<string> {
  return new SignJWT({ typ: 'event', code: await codeDigest(code) })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(secret);
}

export async function verifyEvent(token: string | undefined, code: string, secret: Uint8Array): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    return payload.typ === 'event' && payload.code === (await codeDigest(code));
  } catch {
    return false;
  }
}
