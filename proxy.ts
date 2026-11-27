import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { cookieOptions, EVENT_COOKIE, parseSecret, SESSION_TTL, signEvent, verifyEvent } from './lib/session';

// Gate for the whole site: only visitors who came through the group-chat link get in.
// 1. /any-path?c=<EVENT_CODE> sets the event cookie and redirects to the same path without ?c.
// 2. A valid event cookie passes through.
// 3. Anyone else sees the "Ask Dorian for the link" page, at the URL they asked for.
// Guest identity is not checked here. Pages and server actions call requireGuest() themselves.

function sameCode(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function proxy(request: NextRequest) {
  const code = process.env.EVENT_CODE;
  let secret: Uint8Array;
  try {
    if (!code) throw new Error('EVENT_CODE must be set');
    secret = parseSecret(process.env.SESSION_SECRET);
  } catch (err) {
    console.error('proxy misconfigured', err);
    return NextResponse.rewrite(new URL('/gate', request.url), { status: 503 });
  }

  const given = request.nextUrl.searchParams.get('c');
  if (given !== null && sameCode(given, code)) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete('c');
    const response = NextResponse.redirect(clean);
    response.cookies.set(EVENT_COOKIE, await signEvent(code, secret), cookieOptions(SESSION_TTL));
    return response;
  }

  if (await verifyEvent(request.cookies.get(EVENT_COOKIE)?.value, code, secret)) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL('/gate', request.url), { status: 403 });
}

export const config = {
  // Public: build assets, the link-preview image (chat apps fetch it without cookies),
  // the favicon, and the health check (the Vercel cron calls it without cookies).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|opengraph-image|api/health).*)'],
};
