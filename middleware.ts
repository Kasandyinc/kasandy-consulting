import { NextRequest, NextResponse } from 'next/server'

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Admin protection (existing)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = req.cookies.get('admin_session')
    if (!session?.value) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Paid downloads protection
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
  matcher: ['/admin/:path*', '/downloads/:path*'],
}
