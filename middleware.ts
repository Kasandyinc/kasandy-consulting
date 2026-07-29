import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isOperator } from '@/lib/engine/operators'
import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/admin-session'
import { downloadTokenState, refusalRef } from '@/lib/download-token'

const HUB_HOST = 'hub.kasandyconsulting.com'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Free product slugs — no cookie required for these
const FREE_FILES = new Set([
  'free-procurement-checklist.html',
  'free-nonprofit-scorecard.html',
  'free-kenya-canada-highlights.html',
])

/**
 * Documents a client opens with a token instead of an account: the intake form and
 * the proposal they sign. Matched narrowly — the token segment must be present and
 * hex — so this cannot become a general hole in the operator gate.
 */
function isClientDocRoute(pathname: string): boolean {
  return /^\/(intake|proposal)\/[0-9a-f]{32,64}\/?$/i.test(pathname)
}

function isHubHost(host: string | null): boolean {
  if (!host) return false
  const h = host.split(':')[0].toLowerCase()
  return h === HUB_HOST || h.startsWith('hub.') // hub.localhost etc. in dev
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host')

  // ─── Hub subdomain: isolated, auth-gated Engine ────────────────────────────
  if (isHubHost(host)) {
    // Framework assets pass through. So do public API endpoints that must work
    // without a session — the one-click unsubscribe is clicked from an inbox, and
    // the cron endpoint authenticates itself with a secret.
    if (pathname.startsWith('/_next') || pathname.startsWith('/api/engine')) {
      return NextResponse.next()
    }
    // Every other API route is gated the same way as the rest of the hub: the
    // legacy /api/admin surface must not become reachable via the hub host.
    if (pathname.startsWith('/api')) {
      const { supabaseResponse: apiRes, user: apiUser } = await updateSession(req)
      if (!isOperator(apiUser?.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return apiRes
    }

    // Client-facing documents reached by an unguessable token: an intake form and a
    // proposal to sign. The recipient has no account — in Phase 3 the token IS the
    // credential, so these cannot sit behind the operator gate. They are noindex
    // like the rest of the hub, and each page resolves its own token server-side;
    // an unknown token renders not-found rather than anything belonging to someone
    // else.
    if (isClientDocRoute(pathname)) {
      const clientUrl = req.nextUrl.clone()
      clientUrl.pathname = `/hub${pathname}`
      return NextResponse.rewrite(clientUrl)
    }

    // Refresh the Supabase session first, then read the user.
    const { supabaseResponse, user } = await updateSession(req)
    const allowed = isOperator(user?.email)
    const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth/')
    // The client portal is the one operator-free surface. Being signed in is enough
    // to reach it; whether there is anything to see is RLS's decision, not this
    // file's — a signed-in stranger gets an empty portal, never someone else's
    // engagement. Checking membership here would mean a database round-trip in
    // middleware and a second place for the rule to drift.
    const isPortal = pathname === '/portal' || pathname.startsWith('/portal/')

    // Everything except the login page, auth callback and portal requires an operator.
    if (!allowed && !isAuthRoute && !(isPortal && user)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // Signed-in operators shouldn't sit on the login page.
    if (allowed && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    // A signed-in non-operator has exactly one destination.
    if (!allowed && user && !isPortal && !isAuthRoute) {
      return NextResponse.redirect(new URL('/portal', req.url))
    }

    // Map clean hub URLs onto the internal /hub/* tree (URL bar stays clean).
    if (!pathname.startsWith('/hub')) {
      const rewriteUrl = req.nextUrl.clone()
      rewriteUrl.pathname = `/hub${pathname === '/' ? '' : pathname}`
      const res = NextResponse.rewrite(rewriteUrl)
      supabaseResponse.cookies.getAll().forEach((cookie) => res.cookies.set(cookie))
      return res
    }
    return supabaseResponse
  }

  // ─── Public host (marketing site + legacy /admin) ──────────────────────────
  // Keep the hub's internal tree invisible from the public host.
  if (pathname === '/hub' || pathname.startsWith('/hub/')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // ─── Legacy /admin ─────────────────────────────────────────────────────────
  // The routes under /api/admin read and write submissions, subscribers and site
  // settings, and only login/logout check anything themselves — the original matcher
  // ('/admin/:path*') never covered '/api/admin', so they were reachable with no
  // session at all. That was gated here.
  //
  // The gate itself was then the bug: `if (!session?.value)` tested that a cookie was
  // present, not that it was ours, and the value it looked for was the fixed string
  // 'authenticated'. `Cookie: admin_session=x` was a full admin session. The cookie is
  // now HMAC-signed with its own expiry inside the signature (lib/admin-session.ts),
  // and it is verified rather than counted.
  const needsAdmin =
    (pathname.startsWith('/api/admin') &&
      !pathname.startsWith('/api/admin/login') &&
      !pathname.startsWith('/api/admin/logout')) ||
    (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login'))

  if (needsAdmin) {
    const ok = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)
    if (!ok) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      const res = NextResponse.redirect(loginUrl)
      // Clear a stale or forged cookie so the browser stops presenting it.
      res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' })
      return res
    }
  }

  // ─── Paid downloads ────────────────────────────────────────────────────────
  // This checked that kc_token *looked like* a UUID, which any browser console can
  // produce, so every paid file was free to anyone who knew a filename. Ask the token
  // store — the same authority /api/serve uses — whether the token was ever issued.
  if (pathname.startsWith('/downloads/')) {
    const filename = pathname.split('/').pop() ?? ''
    if (FREE_FILES.has(filename)) {
      return NextResponse.next() // free files pass through
    }

    const token = req.cookies.get('kc_token')?.value
    if (!token || !UUID_RE.test(token)) {
      const dest = new URL('/resources', req.url)
      dest.searchParams.set('ref', 'purchase-required')
      return NextResponse.redirect(dest)
    }

    const state = await downloadTokenState(token)
    if (state !== 'valid' && state !== 'unavailable') {
      const dest = new URL('/resources', req.url)
      dest.searchParams.set('ref', refusalRef(state))
      return NextResponse.redirect(dest)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run on everything except framework assets and common static files, so the
  // hub host-gate and session refresh apply. The public host falls through to
  // NextResponse.next() for ordinary pages (unchanged behavior).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
}
