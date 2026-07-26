import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isOperator } from '@/lib/engine/operators'

const HUB_HOST = 'hub.kasandyconsulting.com'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Free product slugs — no cookie required for these
const FREE_FILES = new Set([
  'free-procurement-checklist.html',
  'free-nonprofit-scorecard.html',
  'free-kenya-canada-highlights.html',
])

function hasValidPurchaseCookie(req: NextRequest): boolean {
  const token = req.cookies.get('kc_token')?.value
  if (!token) return false
  return UUID_RE.test(token)
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
    // API + framework assets pass through untouched (no path rewrite).
    if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return NextResponse.next()
    }

    // Refresh the Supabase session first, then read the user.
    const { supabaseResponse, user } = await updateSession(req)
    const allowed = isOperator(user?.email)
    const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth/')

    // Everything except the login page + auth callback requires an operator.
    if (!allowed && !isAuthRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // Signed-in operators shouldn't sit on the login page.
    if (allowed && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url))
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

  // Admin protection (existing)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = req.cookies.get('admin_session')
    if (!session?.value) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Paid downloads protection (existing)
  if (pathname.startsWith('/downloads/')) {
    const filename = pathname.split('/').pop() ?? ''
    if (FREE_FILES.has(filename)) {
      return NextResponse.next() // free files pass through
    }
    if (!hasValidPurchaseCookie(req)) {
      const dest = new URL('/resources', req.url)
      dest.searchParams.set('ref', 'purchase-required')
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
