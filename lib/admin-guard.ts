import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminSession, ADMIN_COOKIE } from './admin-session'

/**
 * The legacy admin gate, checked by the route rather than only by middleware.
 *
 * Middleware is the primary gate and is now correct, but this route family has
 * already been left unprotected once by a matcher that did not cover it — the
 * original was '/admin/:path*', which never matched '/api/admin/*', so every one of
 * these endpoints answered unauthenticated for as long as that matcher stood. These
 * routes hold every contact-form enquiry and the whole mailing list, so they check
 * for themselves too, and a future change to the matcher cannot expose them again.
 *
 * Kept out of lib/admin-session.ts on purpose: that module is imported by middleware,
 * which runs on the Edge runtime and cannot load next/headers.
 *
 * Usage — first line of each handler:
 *   const denied = await requireAdmin(); if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const ok = await verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value)
  if (ok) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
